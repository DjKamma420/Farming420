import { normalizeEncodedInventory } from './item-normalizer.js';

function normalizeUuid(value) {
  return String(value || '').replaceAll('-', '').trim().toLowerCase();
}

function profilesFromPayload(payload) {
  if (Array.isArray(payload?.profiles)) return payload.profiles;
  if (payload?.profile && typeof payload.profile === 'object') return [payload.profile];
  if (payload?.members && typeof payload.members === 'object') return [payload];
  return [];
}

function resolveProfile(payload) {
  const profiles = profilesFromPayload(payload);
  if (profiles.length === 1) return profiles[0];
  return profiles.find(profile => profile?.selected === true) || null;
}

function resolveMember(profile, requestedUuid) {
  if (!profile?.members || typeof profile.members !== 'object') return null;
  const entries = Object.entries(profile.members).filter(([, member]) => member && typeof member === 'object');
  const target = normalizeUuid(requestedUuid);
  if (target) {
    const match = entries.find(([key, member]) => [
      key,
      member?.uuid,
      member?.player_id,
      member?.profile?.player_id,
    ].map(normalizeUuid).includes(target));
    if (match) return { key: match[0], member: match[1] };
  }
  return entries.length === 1 ? { key: entries[0][0], member: entries[0][1] } : null;
}

function encodedData(value) {
  if (typeof value === 'string') return value.trim() || null;
  if (!value || typeof value !== 'object') return null;
  return typeof value.data === 'string' && value.data.trim() ? value.data.trim() : null;
}

function addContainer(containers, name, value, metadata = {}) {
  const data = encodedData(value);
  if (data) containers.push({ name, data, ...metadata });
}

function collectInventoryContainers(member) {
  const containers = [];
  const inventory = member?.inventory;
  if (inventory && typeof inventory === 'object') {
    addContainer(containers, 'inventory', inventory.inv_contents);
    addContainer(containers, 'armor', inventory.inv_armor);
    addContainer(containers, 'equipment', inventory.equipment_contents);
    addContainer(containers, 'enderchest', inventory.ender_chest_contents);
    addContainer(containers, 'personal_vault', inventory.personal_vault_contents);

    const backpacks = inventory.backpack_contents;
    if (backpacks && typeof backpacks === 'object') {
      for (const [id, encoded] of Object.entries(backpacks)) {
        addContainer(containers, `backpack.${id}`, encoded);
      }
    }

    const talismanBag = inventory.bag_contents?.talisman_bag;
    addContainer(containers, 'talisman_bag', talismanBag);
  }

  return containers;
}

function collectLoadoutContainers(member) {
  const containers = [];
  const loadout = member?.loadout;
  if (!loadout || typeof loadout !== 'object') return containers;

  const armor = loadout.armor;
  if (armor && typeof armor === 'object') {
    const equippedSet = armor.equipped_set == null ? null : String(armor.equipped_set);
    const armorSlots = [
      ['HELMET', 3],
      ['CHESTPLATE', 2],
      ['LEGGINGS', 1],
      ['BOOTS', 0],
    ];
    for (const [setId, set] of Object.entries(armor)) {
      if (setId === 'equipped_set' || !set || typeof set !== 'object') continue;
      for (const [slot, slotOverride] of armorSlots) {
        if (setId === equippedSet) {
          addContainer(containers, 'armor', set[slot], { slotOverride });
        } else {
          addContainer(containers, `loadout.armor.${setId}.${slot.toLowerCase()}`, set[slot]);
        }
      }
    }
  }

  const equipment = loadout.equipment;
  if (equipment && typeof equipment === 'object') {
    const equippedSet = equipment.equipped_set == null ? null : String(equipment.equipped_set);
    const equipmentSlots = [
      ['EQUIPMENT_SLOT_1', 0],
      ['EQUIPMENT_SLOT_2', 1],
      ['EQUIPMENT_SLOT_3', 2],
      ['EQUIPMENT_SLOT_4', 3],
    ];
    for (const [setId, set] of Object.entries(equipment)) {
      if (setId === 'equipped_set' || !set || typeof set !== 'object') continue;
      for (const [slot, slotOverride] of equipmentSlots) {
        if (setId === equippedSet) {
          addContainer(containers, 'equipment', set[slot], { slotOverride });
        } else {
          addContainer(containers, `loadout.equipment.${setId}.${slot.toLowerCase()}`, set[slot]);
        }
      }
    }
  }

  return containers;
}

function mergeDuplicateItems(items) {
  const output = [];
  const byUuid = new Map();
  const isWorn = container => container === 'armor' || container === 'equipment';

  for (const item of items) {
    const location = { container: item.container, slot: item.slot };
    if (!item.itemUuid) {
      output.push({ ...item, locations: [location] });
      continue;
    }

    const existing = byUuid.get(item.itemUuid);
    if (!existing) {
      const normalized = { ...item, locations: [location] };
      byUuid.set(item.itemUuid, normalized);
      output.push(normalized);
      continue;
    }

    if (!existing.locations.some(entry => entry.container === location.container && entry.slot === location.slot)) {
      existing.locations.push(location);
    }
    // Saved loadouts can reference the same physical UUID as the equipped set.
    // Keep the equipped location canonical so setup autofill sees what is
    // actually worn instead of whichever saved set happened to decode first.
    if (!isWorn(existing.container) && isWorn(item.container)) {
      existing.container = item.container;
      existing.slot = item.slot;
    }
  }

  return output;
}

/**
 * Decodes all currently verified farming-relevant member item containers from a
 * raw Hypixel profile payload. A broken/unsupported single container is
 * reported and skipped instead of invalidating the entire profile import.
 */
export async function extractProfileItems(payload, options = {}) {
  const profile = resolveProfile(payload);
  if (!profile) {
    throw new Error('No unambiguous SkyBlock profile was found for item decoding.');
  }
  const selected = resolveMember(profile, options.playerUuid);
  if (!selected) {
    throw new Error('The profile member could not be resolved for item decoding.');
  }

  const containers = [
    ...collectInventoryContainers(selected.member),
    ...collectLoadoutContainers(selected.member),
  ];
  const warnings = [];
  const decoded = [];

  for (const container of containers) {
    try {
      const items = await normalizeEncodedInventory(container.data, { container: container.name });
      if (Number.isInteger(container.slotOverride)) {
        for (const item of items) item.slot = container.slotOverride;
      }
      decoded.push(...items);
    } catch (error) {
      warnings.push(`${container.name}: ${error.message}`);
    }
  }

  return {
    playerUuid: normalizeUuid(selected.key || options.playerUuid) || null,
    profileId: profile.profile_id || null,
    inventoryApiAvailable: Boolean(selected.member?.inventory || selected.member?.loadout),
    encodedContainersFound: containers.length,
    containersDecoded: containers.length - warnings.length,
    items: mergeDuplicateItems(decoded),
    warnings,
  };
}
