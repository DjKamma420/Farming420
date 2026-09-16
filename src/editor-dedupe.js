function pageTitle() {
  return document.querySelector('.content .page-head h1')?.textContent?.trim() || '';
}

function removeCropToolDuplicate() {
  if (pageTitle() !== 'One crop, one workspace') return;
  const content = document.querySelector('.content');
  if (!content || content.dataset.cropDedupeReady === '1') return;
  content.dataset.cropDedupeReady = '1';

  const rows = [...content.querySelectorAll('.section-row')];
  const toolRow = rows.find(row => row.querySelector('h2')?.textContent?.trim() && row.querySelector('button[data-page="tools"]'));
  if (!toolRow) return;

  const duplicateCards = toolRow.nextElementSibling;
  if (duplicateCards?.classList.contains('card-grid')) duplicateCards.remove();

  const copy = toolRow.querySelector('p');
  if (copy) copy.textContent = 'Tool state is edited once in the dedicated Tools workspace.';
}

function simplifyDrawer() {
  const drawer = document.querySelector('.drawer');
  if (!drawer || drawer.dataset.dedupeReady === '1') return;
  drawer.dataset.dedupeReady = '1';

  const sections = [...drawer.querySelectorAll('.drawer-section')];
  const ownership = sections.find(section => section.querySelector('h3')?.textContent?.trim() === 'Ownership & Level');
  if (ownership) ownership.remove();

  const evaluation = sections.find(section => section.querySelector('h3')?.textContent?.trim() === 'Evaluation');
  if (evaluation) {
    const title = evaluation.querySelector('h3');
    if (title) title.textContent = 'Cost & planner evaluation';
  }
}

function apply() {
  removeCropToolDuplicate();
  simplifyDrawer();
}

function boot() {
  apply();
  const app = document.getElementById('app');
  if (!app || typeof MutationObserver === 'undefined') return;
  new MutationObserver(() => queueMicrotask(apply)).observe(app, { childList: true, subtree: true });
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
else boot();
