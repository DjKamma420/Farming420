export const VERIFIED_PET_SWITCHING = Object.freeze([
  Object.freeze({
    id: 'one-active-pet',
    value: 1,
    status: 'ACTIVE',
    lastVerified: '2026-09-16',
    source: 'https://hypixel.net/threads/hypixel-skyblock-0-26-skyblock-resource-pack-loadouts-security-quest-and-more.6117801/',
    notes: 'Hypixel loadouts save one selected pet. Farming420 models pet strategies as time-separated phases, never simultaneous pet stat stacks.',
  }),
  Object.freeze({
    id: 'autopet-two-rules-per-tick-community-observation',
    value: 2,
    status: 'VERIFY',
    lastVerified: '2026-09-16',
    source: 'https://hypixel.net/threads/all-fishing-events-autopet-rules.6069044/',
    notes: 'A March 2026 community guide reports that matching Autopet processing stops after two rules in a tick. Useful for feasibility modelling, but not scored as an official mechanic until independently confirmed.',
  }),
  Object.freeze({
    id: 'pest-kill-autopet-trigger-unavailable',
    value: false,
    status: 'VERIFY',
    lastVerified: '2026-09-16',
    source: 'https://hypixel.net/threads/adding-pests-to-the-kill-a-mob-list-in-autopet-rules.6145356/',
    notes: 'An August 2026 farming suggestion reports Pests are not selectable in the kill-mob Autopet trigger and describes hook/exception workarounds for multi-pet Garden flows.',
  }),
]);
