const GROUPS = [
  ['Fortschritt', ['dashboard', 'account', 'crops', 'tools']],
  ['Loadout', ['gear', 'pets', 'buffs']],
  ['Spezial', ['chips', 'shards', 'pests']],
  ['Analyse', ['planner', 'research', 'coming']],
];

const HUBS = [
  ['account', 'Layer 1', 'Account', 'Skills, Garden, Anita und globale Upgrades.'],
  ['crops', 'Layer 2', 'Crop', 'Crop-spezifische Fortune und Fortschritte.'],
  ['tools', 'Layer 3', 'Tool', 'Reforge, Enchants, Gemstone und Dummies.'],
  ['gear', 'Layer 4', 'Items & Setup', 'Armor, Equipment, Pets, Chips, Shards und Buffs.'],
];

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
  select.setAttribute('aria-label', 'Bereich auswählen');

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
  if (!heading || heading.textContent.trim() !== 'Dein Farming-Fortschritt') return;
  const content = root.querySelector('.content');
  const hero = content?.querySelector('.hero-grid');
  if (!content || !hero || content.querySelector('.layer-hub-grid-addon')) return;

  [...content.children].forEach((node, index) => {
    if (index > [...content.children].indexOf(hero)) node.classList.add('dashboard-detail-addon');
  });

  const section = document.createElement('section');
  section.className = 'dashboard-layer-addon';
  section.innerHTML = '<div class="section-row"><div><h2>Fortschritts-Layer</h2><p>Account → Crop → Tool → Items. Details erscheinen erst nach dem Öffnen.</p></div></div>';

  const grid = document.createElement('div');
  grid.className = 'layer-hub-grid-addon';

  for (const [page, eyebrow, title, description] of HUBS) {
    const button = document.createElement('button');
    button.className = 'layer-hub-addon';
    button.innerHTML = `<span>${eyebrow}</span><strong>${title}</strong><p>${description}</p><b>Öffnen →</b>`;
    button.addEventListener('click', () => clickPage(page));
    grid.appendChild(button);
  }

  section.appendChild(grid);
  hero.insertAdjacentElement('afterend', section);
}

function enhance() {
  const root = document.querySelector('#app');
  if (!root) return;
  groupSidebar(root);
  addMobileNavigation(root);
  simplifyDashboard(root);
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
