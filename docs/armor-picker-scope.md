# Farming armor picker scope

The setup armor picker is intentionally not a generic SkyBlock wardrobe.

Current farming progression follows Hypixel SkyBlock 0.26.1:

Farmhand -> Haymaker -> Sprout -> Tater -> Cropie -> Squash -> Fermento -> Helianthus.

The picker also keeps Rancher's Boots, Farmer Boots, and both Pufferfish helmet/hat ids used by farming loadouts. `PUFFERFISH_HAT_CELEBRATION` is kept separately because the Century/Raffle reward comes with Thorns V and can increase Thorny-equipment Overbloom; the ordinary `PUFFERFISH_HAT` must not inherit that enchantment. Legacy pre-0.26.1 ids remain accepted so restored profiles do not lose their selected armor.

Combat armor and Rabbit Armor are excluded from the picker. Equipment remains separately filtered by its own slot categories.
