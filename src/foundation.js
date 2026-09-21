import {
  APP_VERSION,
  DATA_SCHEMA_VERSION,
  STORAGE_KEY,
} from './config.js';
import {
  backupFilename,
  createBackupPayload,
  downloadJson,
  readJsonFile,
  validateBackupPayload,
} from './backup.js';
import { migrateState } from './migrations.js';
import { maskApiKey, readApiKey, writeApiKey } from './credentials.js';
import { syncProfile } from './live-sync.js';

let deferredInstallPrompt = null;
let settingsDialog = null;

function readState() {
  let stored = {};
  try {
    stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
  } catch {
    stored = {};
  }
  // Settings must never write an outdated shape back, and must never stamp an
  // unmigrated state with the current schema version.
  return migrateState(stored).state;
}

function writeState(state) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function formatTime(value) {
  if (!value) return 'Never';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Unknown' : date.toLocaleString('en-GB');
}

function escapeHtml(value = '') {
  return String(value).replace(/[&<>'"]/g, character => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    "'": '&#039;',
    '"': '&quot;',
  })[character]);
}

function setStatus(message, type = 'neutral') {
  const target = settingsDialog?.querySelector('[data-settings-status]');
  if (!target) return;
  target.textContent = message;
  target.dataset.type = type;
}

function currentMeta() {
  const state = readState();
  return state.profile?.importMeta || {};
}

function settingsMarkup() {
  const state = readState();
  const meta = currentMeta();
  const playerUuid = state.profile?.playerUuid || '';
  const storedKey = readApiKey();
  const sync = state.profile?.lastSync || {};
  const profileOptions = Array.isArray(sync.availableProfiles) ? sync.availableProfiles : [];
  const selectedProfileId = state.profile?.skyblockProfileId || '';
  const accessModeLabel = storedKey ? 'Own API key' : 'Not configured';
  return `
    <div class="settings-shell" role="document">
      <div class="settings-header">
        <div>
          <div class="settings-eyebrow">Farming420</div>
          <h2>Settings</h2>
        </div>
        <button class="settings-close" type="button" data-settings-close aria-label="Close settings">×</button>
      </div>

      <div class="settings-status" data-settings-status data-type="neutral">Local data stays on this device unless you export a backup.</div>

      <section class="settings-section">
        <div class="settings-section-copy">
          <h3>Live sync</h3>
          <p>Paste your API key and your Minecraft UUID, and Farming420 syncs automatically. It reads your selected SkyBlock profile and Garden and writes every value it can derive straight onto the cards.</p>
        </div>
        <label class="settings-field">
          <span>Your Minecraft UUID <a href="https://namemc.com/" target="_blank" rel="noreferrer">(look yours up)</a></span>
          <input type="text" data-player-uuid value="${escapeHtml(playerUuid)}" placeholder="32 characters, with or without dashes" autocomplete="off" spellcheck="false">
        </label>
        ${profileOptions.length > 1 ? `
        <label class="settings-field">
          <span>SkyBlock profile</span>
          <select data-profile-select>
            ${profileOptions.map(option => `<option value="${escapeHtml(option.profileId)}" ${option.profileId === selectedProfileId ? 'selected' : ''}>${escapeHtml(option.profileName || option.profileId)}${option.selected ? ' (in game)' : ''}</option>`).join('')}
          </select>
        </label>` : ''}
        <div class="settings-actions">
          <button class="settings-button primary" type="button" data-sync-now>Sync now</button>
        </div>
        <div class="settings-meta-grid">
          <div><span>Last sync</span><strong>${escapeHtml(formatTime(sync.finishedAt))}</strong></div>
          <div><span>Values filled in</span><strong>${escapeHtml(sync.appliedCount ?? 'Not synced')}</strong></div>
          <div><span>Access mode</span><strong>${escapeHtml(accessModeLabel)}</strong></div>
          <div><span>Profile</span><strong>${escapeHtml(state.profile?.skyblockProfileName || 'Not linked')}</strong></div>
          <div><span>Farming level</span><strong>${escapeHtml(meta.profile?.farmingLevel ?? 'Not synced')}</strong></div>
          <div><span>Items detected</span><strong>${escapeHtml(sync.itemsNormalized ?? 'Not synced')}</strong></div>
          <div><span>Crop upgrades</span><strong>${escapeHtml(sync.cropUpgradesImported ?? 'Not synced')}</strong></div>
        </div>
        ${sync.warnings?.length ? `<div class="settings-warnings"><strong>${sync.warnings.length} note${sync.warnings.length === 1 ? '' : 's'} from the last sync</strong><ul>${sync.warnings.map(warning => `<li>${escapeHtml(warning)}</li>`).join('')}</ul></div>` : ''}
      </section>

      <section class="settings-section">
        <div class="settings-section-copy">
          <h3>Hypixel access</h3>
          <p>Profile and Garden endpoints require a key. Yours stays in this browser and is sent only to api.hypixel.net. A key is never written into a backup.</p>
        </div>
        <label class="settings-field">
          <span>Your Hypixel API key <a href="https://developer.hypixel.net/" target="_blank" rel="noreferrer">(get one)</a></span>
          <input type="password" data-api-key placeholder="${escapeHtml(storedKey ? maskApiKey(storedKey) : 'Paste your personal key')}" autocomplete="off" spellcheck="false">
        </label>
        <div class="settings-actions">
          <button class="settings-button danger" type="button" data-clear-key ${storedKey ? '' : 'disabled'}>Forget stored key</button>
        </div>
      </section>

      <section class="settings-section">
        <div class="settings-section-copy">
          <h3>Backup & Restore</h3>
          <p>Backups include the complete local Farming420 state and schema metadata so future versions can migrate safely.</p>
        </div>
        <div class="settings-actions">
          <button class="settings-button" type="button" data-backup-download>Download backup</button>
          <label class="settings-button file-button">Restore backup<input data-backup-restore type="file" accept="application/json,.json" hidden></label>
          <button class="settings-button danger" type="button" data-reset-app>Reset local data</button>
        </div>
      </section>

      <section class="settings-section">
        <div class="settings-section-copy">
          <h3>App & Updates</h3>
          <p>Reloading checks the current GitHub Pages deployment, removes only obsolete Farming420 caches and service workers, and keeps your local profile/settings data.</p>
        </div>
        <div class="settings-meta-grid">
          <div><span>App version</span><strong>${APP_VERSION}</strong></div>
          <div><span>Data schema</span><strong>${DATA_SCHEMA_VERSION}</strong></div>
          <div><span>Update delivery</span><strong>Commit-based</strong></div>
          <div><span>Install state</span><strong>${window.matchMedia?.('(display-mode: standalone)').matches ? 'Installed' : 'Browser tab'}</strong></div>
        </div>
        <div class="settings-actions">
          <button class="settings-button" type="button" data-install-app ${deferredInstallPrompt ? '' : 'disabled'}>Install app</button>
          <button class="settings-button" type="button" data-check-update>Reload latest version</button>
        </div>
      </section>
    </div>
  `;
}

function closeSettings() {
  settingsDialog?.close();
}

function openSettings() {
  if (!settingsDialog) {
    settingsDialog = document.createElement('dialog');
    settingsDialog.className = 'settings-dialog';
    settingsDialog.addEventListener('click', event => {
      if (event.target === settingsDialog) closeSettings();
    });
    document.body.appendChild(settingsDialog);
  }
  settingsDialog.innerHTML = settingsMarkup();
  bindSettings();
  settingsDialog.showModal();
}

function saveProfileField(field, value) {
  const state = readState();
  state.profile ||= {};
  state.profile[field] = value;
  writeState(state);
}

function saveLastSync(report) {
  const state = readState();
  state.profile ||= {};
  if (report.playerName) state.profile.playerName = report.playerName;
  if (report.playerUuid) state.profile.playerUuid = report.playerUuid;
  if (report.profileId) state.profile.skyblockProfileId = report.profileId;
  // Only the sync summary is stored, never the raw API payloads.
  state.profile.lastSync = {
    finishedAt: report.finishedAt,
    mode: report.mode,
    availableProfiles: report.availableProfiles,
    itemsNormalized: report.itemsNormalized,
    cropUpgradesImported: report.cropUpgradesImported,
    unlockedPlots: report.unlockedPlots,
    gardenSynced: report.gardenSynced,
    appliedCount: report.appliedCount,
    warnings: report.warnings,
  };
  writeState(state);
}

/** Both credentials present means a sync can run without asking again. */
function syncIsConfigured(state = readState()) {
  const hasAccess = Boolean(readApiKey());
  return hasAccess && Boolean(state.profile?.playerUuid);
}

async function handleLiveSync() {
  const state = readState();
  const uuid = settingsDialog.querySelector('[data-player-uuid]')?.value?.trim() || state.profile?.playerUuid || '';
  const profileId = settingsDialog.querySelector('[data-profile-select]')?.value || '';
  if (!uuid) throw new Error('Enter your Minecraft UUID first.');

  setStatus('Syncing…', 'neutral');
  const report = await syncProfile({
    playerUuid: uuid,
    profileId,
    apiKey: readApiKey(),
  });
  saveLastSync(report);

  const parts = [
    report.farmingLevel === null ? 'Farming level not derived' : `Farming level ${report.farmingLevel}`,
    report.itemsNormalized === null ? 'no item data' : `${report.itemsNormalized} items`,
    report.gardenSynced ? `${report.cropUpgradesImported ?? 0} crop upgrades` : 'Garden not synced',
    `${report.appliedCount} values written to the app`,
  ];
  // Re-render first so the profile picker and freshly imported values appear,
  // then write the status: re-rendering replaces the status element.
  settingsDialog.innerHTML = settingsMarkup();
  bindSettings();
  setStatus(
    `Synced ${report.profileName || report.playerUuid}: ${parts.join(', ')}.`,
    report.warnings.length ? 'warning' : 'success',
  );
  // The app shell renders from the same state, so it has to re-read it.
  window.dispatchEvent(new CustomEvent('farming420:state-changed'));
}

/**
 * Runs a sync as soon as both credentials exist, so entering the key is all the
 * user has to do. Failures surface in the status line, never as an exception.
 */
async function syncIfConfigured() {
  const state = readState();
  const hasAccess = Boolean(readApiKey());
  const hasUuid = Boolean(state.profile?.playerUuid);

  // Saying nothing would look like the app ignored the value that was entered.
  if (!hasAccess || !hasUuid) {
    if (hasAccess && !hasUuid) setStatus('Access is configured. Add your Minecraft UUID above to sync.', 'warning');
    else if (!hasAccess && hasUuid) setStatus('UUID saved. Add your Hypixel API key below to sync.', 'warning');
    return;
  }

  try {
    await handleLiveSync();
  } catch (error) {
    setStatus(error.message, 'error');
  }
}

function savePlayerUuid(input) {
  const state = readState();
  state.profile ||= {};
  state.profile.playerUuid = String(input.value || '').replaceAll('-', '').trim().toLowerCase();
  writeState(state);
}

function bindSettings() {
  settingsDialog.querySelector('[data-settings-close]')?.addEventListener('click', closeSettings);

  settingsDialog.querySelector('[data-player-uuid]')?.addEventListener('change', async event => {
    savePlayerUuid(event.target);
    await syncIfConfigured();
  });


  settingsDialog.querySelector('[data-api-key]')?.addEventListener('change', async event => {
    const value = String(event.target.value || '').trim();
    if (!value) return;
    try {
      writeApiKey(value);
      event.target.value = '';
      settingsDialog.innerHTML = settingsMarkup();
      bindSettings();
      setStatus('API key stored in this browser only. It is never included in a backup.', 'success');
      // Entering the key is usually the last missing piece, so sync now.
      await syncIfConfigured();
    } catch (error) {
      setStatus(error.message, 'error');
    }
  });

  settingsDialog.querySelector('[data-clear-key]')?.addEventListener('click', () => {
    writeApiKey('');
    settingsDialog.innerHTML = settingsMarkup();
    bindSettings();
    setStatus('Stored API key removed from this browser.', 'success');
  });

  settingsDialog.querySelector('[data-sync-now]')?.addEventListener('click', async event => {
    event.target.disabled = true;
    try {
      await handleLiveSync();
    } catch (error) {
      setStatus(error.message, 'error');
    } finally {
      const button = settingsDialog.querySelector('[data-sync-now]');
      if (button) button.disabled = false;
    }
  });

  settingsDialog.querySelector('[data-backup-download]')?.addEventListener('click', () => {
    downloadJson(backupFilename(), createBackupPayload(readState()));
    setStatus('Backup downloaded.', 'success');
  });

  settingsDialog.querySelector('[data-backup-restore]')?.addEventListener('change', async event => {
    try {
      // The restored state is migrated to the current schema before it is
      // written, so an older backup cannot reintroduce an outdated data shape.
      const restored = validateBackupPayload(await readJsonFile(event.target.files?.[0]));
      writeState(restored.state);
      window.dispatchEvent(new Event('farming420:state-changed'));
      settingsDialog.innerHTML = settingsMarkup();
      bindSettings();
      setStatus('Backup restored.', 'success');
    } catch (error) {
      setStatus(error.message, 'error');
      event.target.value = '';
    }
  });

  settingsDialog.querySelector('[data-reset-app]')?.addEventListener('click', () => {
    if (!confirm('Delete all locally stored Farming420 profile data on this device? Download a backup first if you need it.')) return;
    localStorage.removeItem(STORAGE_KEY);
    window.dispatchEvent(new Event('farming420:state-changed'));
    settingsDialog.innerHTML = settingsMarkup();
    bindSettings();
    setStatus('Local profile data reset.', 'success');
  });

  settingsDialog.querySelector('[data-install-app]')?.addEventListener('click', async () => {
    if (!deferredInstallPrompt) {
      setStatus('The browser is not currently offering an install prompt. Use the browser install menu if available.', 'warning');
      return;
    }
    deferredInstallPrompt.prompt();
    await deferredInstallPrompt.userChoice;
    deferredInstallPrompt = null;
    openSettings();
  });

  settingsDialog.querySelector('[data-check-update]')?.addEventListener('click', () => {
    setStatus('Reloading the latest deployed version. Local settings are preserved.', 'success');
    void forceReloadApp();
  });
}

/**
 * Reload the deployed app without touching Farming420 profile/settings storage.
 * Query-string cache busting ensures the HTML request cannot reuse a stale URL,
 * while the Pages build stamp gives every local asset an immutable build id.
 */
async function forceReloadApp() {
  if ('serviceWorker' in navigator) {
    const registrations = await navigator.serviceWorker.getRegistrations().catch(() => []);
    const appScope = new URL('./', document.baseURI).href;
    await Promise.all(
      registrations
        .filter(registration => registration.scope.startsWith(appScope))
        .map(registration => registration.unregister()),
    );
  }

  if ('caches' in window) {
    const names = await caches.keys().catch(() => []);
    await Promise.all(
      names
        .filter(name => name.startsWith('farming420-'))
        .map(name => caches.delete(name)),
    );
  }

  const url = new URL(window.location.href);
  url.searchParams.set('reload', Date.now().toString(36));
  window.location.replace(url.href);
}

function bindAppControls() {
  const app = document.getElementById('app');
  if (!app) return;

  const settingsButton = app.querySelector('[data-open-settings]');
  if (settingsButton && !settingsButton.dataset.settingsBound) {
    settingsButton.dataset.settingsBound = '1';
    settingsButton.addEventListener('click', openSettings);
  }
}

window.addEventListener('beforeinstallprompt', event => {
  event.preventDefault();
  deferredInstallPrompt = event;
});

const observer = new MutationObserver(bindAppControls);
observer.observe(document.getElementById('app'), { childList: true, subtree: true });
bindAppControls();
