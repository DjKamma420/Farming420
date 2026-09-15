const GROUPS = [
  ['Progress', ['dashboard', 'account', 'crops', 'tools']],
  ['Loadout', ['gear', 'pets', 'buffs']],
  ['Specialized', ['chips', 'shards', 'pests']],
  ['Analysis', ['planner', 'research', 'coming']],
];

const HUBS = [
  ['account', 'Layer 1', 'Account', 'Skills, Garden, Anita and global upgrades.'],
  ['crops', 'Layer 2', 'Crop', 'Crop-specific Fortune and progression.'],
  ['tools', 'Layer 3', 'Tool', 'Reforge, enchantments, gemstones and Farming for Dummies.'],
  ['gear', 'Layer 4', 'Items & Setup', 'Armor, equipment, pets, chips, shards and buffs.'],
];

const CROP_LAYER_KEY = 'farming420-crop-layer';

function clickPage(id) {
  document.querySelector(`.sidebar [data-page="${id}"]`)?.click();
}

function groupSidebar(root) {
  const nav = root.querySelector('.sidebar nav');
  if (!nav || nav.dataset.grouped === '1') return;
  nav.dataset.grouped = '1';

  for (const [label, ids] of GROUPS) {
    const group = document.createElement('div');
    group.className = 'nav-group-addon';

    const title = document.createElement('div');
    title.className = 'nav-group-title-addon';
    title.textContent = label;
    group.appendChild(title);

    for (const id of ids) {
      const button = nav.querySelector(`[data-page="${id}"]`);
      if (button) group.appendChild(button);
    }
    nav.appendChild(group);
  }
}

function addMobileNavigation(root) {
  const topbar = root.querySelector('.topbar');
  if (!topbar || topbar.querySelector('.mobile-page-select-addon')) return;

  const select = document.createElement('select');
  select.className = 'mobile-page-select-addon';
  select.setAttribute('aria-label', 'Choose section');

  const buttons = [...root.querySelectorAll('.sidebar [data-page]')];
  for (const button of buttons) {
    const option = document.createElement('option');
    option.value = button.dataset.page;
    option.textContent = button.textContent.trim();
    option.selected = button.classList.contains('active');
    select.appendChild(option);
  }

  select.addEventListener('change', () => clickPage(select.value));
  topbar.prepend(select);
}

function simplifyDashboard(root) {
  const heading = root.querySelector('.page-head h1');
  if (!heading || heading.textContent.trim() !== 'Your Farming Progress') return;
  const content = root.querySelector('.content');
  const hero = content?.querySelector('.hero-grid');
  if (!content || !hero || content.querySelector('.layer-hub-grid-addon')) return;

  [...content.children].forEach((node, index) => {
    if (index > [...content.children].indexOf(hero)) node.classList.add('dashboard-detail-addon');
  });

  const section = document.createElement('section');
  section.className = 'dashboard-layer-addon';
  section.innerHTML = '<div class="section-row"><div><h2>Progress layers</h2><p>Account → Crop → Tool → Items. Details appear only after opening a layer.</p></div></div>';

  const grid = document.createElement('div');
  grid.className = 'layer-hub-grid-addon';

  for (const [page, eyebrow, title, description] of HUBS) {
    const button = document.createElement('button');
    button.className = 'layer-hub-addon';
    button.innerHTML = `<span>${eyebrow}</span><strong>${title}</strong><p>${description}</p><b>Open →</b>`;
    button.addEventListener('click', () => clickPage(page));
    grid.appendChild(button);
  }

  section.appendChild(grid);
  hero.insertAdjacentElement('afterend', section);
}

function setCropWorkspaceLayer(panel, layer) {
  const grids = [...panel.querySelectorAll(':scope > .card-grid')];
  const rows = [...panel.querySelectorAll(':scope > .section-row')];
  const cropGrid = grids[0];
  const toolGrid = grids[1];
  const toolRow = rows[1];

  if (!cropGrid || !toolGrid || !toolRow) return;

  cropGrid.hidden = layer !== 'crop';
  toolGrid.hidden = layer !== 'tool';
  toolRow.hidden = layer !== 'tool';

  panel.querySelectorAll('.workspace-tab-addon').forEach(button => {
    button.classList.toggle('active', button.dataset.layer === layer);
    button.setAttribute('aria-selected', String(button.dataset.layer === layer));
  });

  localStorage.setItem(CROP_LAYER_KEY, layer);
}

function enhanceCropWorkspace(root) {
  const heading = root.querySelector('.page-head h1');
  if (!heading || heading.textContent.trim() !== 'One crop, one workspace') return;

  const picker = root.querySelector('.crop-grid');
  const panel = root.querySelector('.crop-detail-panel');
  if (!picker || !panel || panel.dataset.workspace === '1') return;

  picker.classList.add('crop-picker-addon');
  panel.classList.add('crop-workspace-addon');
  panel.dataset.workspace = '1';

  const oldTabs = panel.querySelector('.layer-tabs');
  if (oldTabs) oldTabs.hidden = true;

  const firstRow = panel.querySelector(':scope > .section-row');
  if (!firstRow) return;

  const tabs = document.createElement('div');
  tabs.className = 'workspace-tabs-addon';
  tabs.setAttribute('role', 'tablist');
  tabs.innerHTML = `
    <button class="workspace-tab-addon" data-layer="crop" role="tab">Crop</button>
    <button class="workspace-tab-addon" data-layer="tool" role="tab">Tool</button>
    <button class="workspace-tab-addon setup" data-layer="setup" role="tab">Items & Setup</button>
  `;
  firstRow.insertAdjacentElement('afterend', tabs);

  tabs.querySelector('[data-layer="crop"]').addEventListener('click', () => setCropWorkspaceLayer(panel, 'crop'));
  tabs.querySelector('[data-layer="tool"]').addEventListener('click', () => setCropWorkspaceLayer(panel, 'tool'));
  tabs.querySelector('[data-layer="setup"]').addEventListener('click', () => clickPage('gear'));

  const grids = [...panel.querySelectorAll(':scope > .card-grid')];
  if (grids[0]) grids[0].classList.add('workspace-grid-addon', 'crop-layer-grid-addon');
  if (grids[1]) grids[1].classList.add('workspace-grid-addon', 'tool-layer-grid-addon');

  const savedLayer = localStorage.getItem(CROP_LAYER_KEY);
  setCropWorkspaceLayer(panel, savedLayer === 'tool' ? 'tool' : 'crop');
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
    <button type="button">Crop workspace</button>
  `;
  context.querySelector('button').addEventListener('click', () => clickPage('crops'));
  heading.insertAdjacentElement('afterend', context);
}

function enhance() {
  const root = document.querySelector('#app');
  if (!root) return;
  groupSidebar(root);
  addMobileNavigation(root);
  simplifyDashboard(root);
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
