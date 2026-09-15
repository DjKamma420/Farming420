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
import { importGardenPayload, importProfilePayload } from './hypixel-import.js';

let deferredInstallPrompt = null;
let settingsDialog = null;
let serviceWorkerRegistration = null;
let reloadingForUpdate = false;

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
          <h3>Profile & API</h3>
          <p>Raw Hypixel JSON import works without storing an API key. Production live sync will use a server-side proxy later.</p>
        </div>
        <label class="settings-field">
          <span>Your Minecraft UUID</span>
          <input type="text" data-player-uuid value="${escapeHtml(playerUuid)}" placeholder="Optional for solo profiles, required to disambiguate co-op imports">
        </label>
        <div class="settings-actions">
          <label class="settings-button file-button">Import profile JSON<input data-profile-json type="file" accept="application/json,.json" hidden></label>
          <label class="settings-button file-button">Import Garden JSON<input data-garden-json type="file" accept="application/json,.json" hidden></label>
        </div>
        <div class="settings-meta-grid">
          <div><span>Profile import</span><strong>${escapeHtml(formatTime(meta.profile?.importedAt))}</strong></div>
          <div><span>Garden import</span><strong>${escapeHtml(formatTime(meta.garden?.importedAt))}</strong></div>
          <div><span>Profile</span><strong>${escapeHtml(state.profile?.skyblockProfileName || 'Not linked')}</strong></div>
          <div><span>Farming level</span><strong>${escapeHtml(meta.profile?.farmingLevel ?? 'Not synced')}</strong></div>
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
          <p>The service worker keeps one coherent offline app version. Updates replace the cached app as a unit instead of mixing old and new files.</p>
        </div>
        <div class="settings-meta-grid">
          <div><span>App version</span><strong>${APP_VERSION}</strong></div>
          <div><span>Data schema</span><strong>${DATA_SCHEMA_VERSION}</strong></div>
          <div><span>Offline support</span><strong>${'serviceWorker' in navigator ? 'Supported' : 'Unavailable'}</strong></div>
          <div><span>Install state</span><strong>${window.matchMedia?.('(display-mode: standalone)').matches ? 'Installed' : 'Browser tab'}</strong></div>
        </div>
        <div class="settings-actions">
          <button class="settings-button" type="button" data-install-app ${deferredInstallPrompt ? '' : 'disabled'}>Install app</button>
          <button class="settings-button" type="button" data-check-update>Check for updates</button>
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

function savePlayerUuid(input) {
  const state = readState();
  state.profile ||= {};
  state.profile.playerUuid = String(input.value || '').replaceAll('-', '').trim().toLowerCase();
  writeState(state);
}

async function handleProfileImport(file) {
  const payload = await readJsonFile(file);
  const uuidInput = settingsDialog.querySelector('[data-player-uuid]');
  savePlayerUuid(uuidInput);
  const report = await importProfilePayload(payload, { playerUuid: uuidInput.value });
  const details = report.farmingLevel === null ? 'Farming level could not be derived.' : `Farming level ${report.farmingLevel} imported.`;
  setStatus(`Profile import completed. ${details}${report.warnings.length ? ` ${report.warnings.join(' ')}` : ''}`, report.warnings.length ? 'warning' : 'success');
}

async function handleGardenImport(file) {
  const payload = await readJsonFile(file);
  const report = importGardenPayload(payload);
  const warning = report.unknownCropKeys.length ? ` Unknown crop keys: ${report.unknownCropKeys.join(', ')}.` : '';
  setStatus(`Garden import completed: ${report.cropUpgradesImported} crop upgrades, ${report.unlockedPlots ?? 'unknown'} plots.${warning}`, warning ? 'warning' : 'success');
}

function bindSettings() {
  settingsDialog.querySelector('[data-settings-close]')?.addEventListener('click', closeSettings);

  settingsDialog.querySelector('[data-player-uuid]')?.addEventListener('change', event => savePlayerUuid(event.target));

  settingsDialog.querySelector('[data-profile-json]')?.addEventListener('change', async event => {
    try {
      await handleProfileImport(event.target.files?.[0]);
    } catch (error) {
      setStatus(error.message, 'error');
    } finally {
      event.target.value = '';
    }
  });

  settingsDialog.querySelector('[data-garden-json]')?.addEventListener('change', async event => {
    try {
      await handleGardenImport(event.target.files?.[0]);
    } catch (error) {
      setStatus(error.message, 'error');
    } finally {
      event.target.value = '';
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
      location.reload();
    } catch (error) {
      setStatus(error.message, 'error');
      event.target.value = '';
    }
  });

  settingsDialog.querySelector('[data-reset-app]')?.addEventListener('click', () => {
    if (!confirm('Delete all locally stored Farming420 profile data on this device? Download a backup first if you need it.')) return;
    localStorage.removeItem(STORAGE_KEY);
    location.reload();
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

  settingsDialog.querySelector('[data-check-update]')?.addEventListener('click', async () => {
    if (!serviceWorkerRegistration) {
      setStatus('Service worker is not registered in this browser.', 'warning');
      return;
    }
    try {
      await serviceWorkerRegistration.update();
      setStatus('Update check completed. A new version will reload automatically after activation.', 'success');
    } catch (error) {
      setStatus(`Update check failed: ${error.message}`, 'error');
    }
  });
}

/**
 * Settings lives in the top bar rather than the sidebar: the sidebar is hidden
 * below 780px, which would otherwise leave backup, restore, import and update
 * controls unreachable on exactly the mobile-first layout the app targets.
 */
function addSettingsButton() {
  const topbar = document.querySelector('.topbar');
  if (!topbar || topbar.querySelector('[data-open-settings]')) return;
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'settings-entry';
  button.dataset.openSettings = '1';
  button.setAttribute('aria-label', 'Open settings');
  button.innerHTML = '<span aria-hidden="true">\u2699</span><span class="settings-entry-label">Settings</span>';
  button.addEventListener('click', openSettings);
  topbar.appendChild(button);
}

async function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return;
  try {
    serviceWorkerRegistration = await navigator.serviceWorker.register('./sw.js');
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (reloadingForUpdate) return;
      reloadingForUpdate = true;
      location.reload();
    });
  } catch (error) {
    console.warn('Farming420 service worker registration failed:', error);
  }
}

window.addEventListener('beforeinstallprompt', event => {
  event.preventDefault();
  deferredInstallPrompt = event;
});

const observer = new MutationObserver(addSettingsButton);
observer.observe(document.getElementById('app'), { childList: true, subtree: true });
addSettingsButton();
registerServiceWorker();
