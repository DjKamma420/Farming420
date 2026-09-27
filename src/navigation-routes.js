export const DUPLICATE_PAGE_TARGETS = Object.freeze({
  account: 'crops',
  accessories: 'shards',
  gear: 'setups',
  pets: 'setups',
  chips: 'shards',
  pests: 'info',
  guide: 'info',
  setup: 'info',
  research: 'info',
  coming: 'info',
});

export function canonicalPage(page) {
  return DUPLICATE_PAGE_TARGETS[page] || page;
}
