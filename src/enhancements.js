/**
 * Every nav page belongs to exactly one group.
 *
 * Pages left out of this table are not dropped -- they stay in the nav, ahead
 * of the groups, because `groupSidebar` appends groups after whatever it did
 * not move. The table stays in lockstep with the actual navigation, and
 * `tests/nav-groups.test.js` fails if a page is missing or a retired page is
 * left behind here.
 */
const GROUPS = [
  ['Overview', ['dashboard']],
  ['Profile', ['crops', 'tools', 'accessories', 'setups', 'gear', 'pets', 'buffs']],
  ['Advanced', ['pests', 'chips', 'shards']],
  ['Planning', ['focus', 'planner']],
  ['Guides', ['info', 'qol']],
  ['System', ['settings']],
];

function clickPage(id) {
  document.querySelector(`.sidebar [data-page="${id}"]`)?.click();
}

function groupSidebar(root) {
  const nav = root.querySelector('.sidebar nav');
  if (!nav || nav.dataset.grouped === '1') return;
  nav.dataset.grouped = '1';

  for (const [label, ids] of GROUPS) {
    const buttons = ids
      .map(id => nav.querySelector(`[data-page="${id}"], [data-nav-id="${id}"]`))
      .filter(Boolean);
    // navigation-dedupe.js can remove legacy destinations before grouping.
    // A removed destination must not leave an empty section heading behind.
    if (!buttons.length) continue;

    const group = document.createElement('div');
    group.className = 'nav-group-addon';

    const title = document.createElement('div');
    title.className = 'nav-group-title-addon';
    title.textContent = label;
    group.appendChild(title);

    for (const button of buttons) group.appendChild(button);
    nav.appendChild(group);
  }
}


function enhanceCropWorkspace(root) {
  const heading = root.querySelector('.page-head h1');
  if (!heading || heading.textContent.trim() !== 'Garden & Crop Progression') return;

  const picker = root.querySelector('.crop-grid');
  const panel = root.querySelector('.crop-detail-panel');
  if (!picker || !panel || panel.dataset.workspace === '1') return;

  picker.classList.add('crop-picker-addon');
  panel.classList.add('crop-workspace-addon');
  panel.dataset.workspace = '1';

  const cropGrid = panel.querySelector(':scope > .card-grid');
  cropGrid?.classList.add('workspace-grid-addon', 'crop-layer-grid-addon');
}

function improveToolsPage(root) {
  const active = root.querySelector('.sidebar .nav-link.active');
  if (active?.dataset.page !== 'tools') return;
  const content = root.querySelector('.content');
  if (!content || content.querySelector('.tool-context-addon')) return;

  const heading = content.querySelector('.page-head');
  if (!heading) return;

  const cropSelect = root.querySelector('#cropSelect');
  const cropName = cropSelect?.selectedOptions?.[0]?.textContent?.trim() || 'Crop';
  const toolBadge = content.querySelector('.filter-line .badge:last-child');
  const toolName = toolBadge?.textContent?.trim() || 'Crop Tool';

  const context = document.createElement('div');
  context.className = 'tool-context-addon';
  context.innerHTML = `
    <div><span>Crop</span><strong>${cropName}</strong></div>
    <div class="tool-context-arrow">→</div>
    <div><span>Active tool</span><strong>${toolName}</strong></div>
    <button type="button">Garden</button>
  `;
  context.querySelector('button').addEventListener('click', () => clickPage('crops'));
  heading.insertAdjacentElement('afterend', context);
}

function enhance() {
  const root = document.querySelector('#app');
  if (!root) return;
  groupSidebar(root);
  enhanceCropWorkspace(root);
  improveToolsPage(root);
}

let scheduled = false;
const observer = new MutationObserver(() => {
  if (scheduled) return;
  scheduled = true;
  queueMicrotask(() => {
    scheduled = false;
    enhance();
  });
});

observer.observe(document.querySelector('#app'), { childList: true, subtree: true });
enhance();
