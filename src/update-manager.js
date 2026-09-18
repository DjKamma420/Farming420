const VERSION_FILE = 'deploy-version.json';
const RELOAD_ATTEMPT_KEY = 'farming420:update-reload-build';
const BUILD_ID_PATTERN = /^[0-9a-f]{7,64}$/i;

let pendingBuild = null;
let runningCheck = null;

function deployedBuild() {
  const value = document.querySelector('meta[name="app-build"]')?.content?.trim() || '';
  return BUILD_ID_PATTERN.test(value) ? value : null;
}

function isEditing() {
  const active = document.activeElement;
  if (!active) return false;
  return active.matches?.('input, textarea, select') || active.isContentEditable === true;
}

async function retireLegacyUpdateState() {
  const appScope = new URL('./', document.baseURI).href;

  if ('serviceWorker' in navigator) {
    const registrations = await navigator.serviceWorker.getRegistrations();
    await Promise.all(
      registrations
        .filter(registration => registration.scope.startsWith(appScope))
        .map(registration => registration.unregister()),
    );
  }

  if ('caches' in window) {
    const names = await caches.keys();
    await Promise.all(
      names
        .filter(name => name.startsWith('farming420-'))
        .map(name => caches.delete(name)),
    );
  }
}

async function fetchLatestBuild() {
  const url = new URL(VERSION_FILE, document.baseURI);
  url.searchParams.set('check', String(Date.now()));
  const response = await fetch(url, { cache: 'no-store' });
  if (!response.ok) return null;

  const payload = await response.json();
  const build = typeof payload?.build === 'string' ? payload.build.trim() : '';
  return BUILD_ID_PATTERN.test(build) ? build : null;
}

async function applyPendingUpdateIfSafe() {
  if (!pendingBuild || document.visibilityState !== 'visible' || isEditing()) return;

  const build = pendingBuild;
  pendingBuild = null;

  if (sessionStorage.getItem(RELOAD_ATTEMPT_KEY) === build) return;
  sessionStorage.setItem(RELOAD_ATTEMPT_KEY, build);

  await retireLegacyUpdateState().catch(() => {});
  const url = new URL(window.location.href);
  url.searchParams.set('build', build.slice(0, 12));
  window.location.replace(url.href);
}

async function checkForUpdate() {
  if (runningCheck) return runningCheck;

  runningCheck = (async () => {
    let latest = null;
    try {
      latest = await fetchLatestBuild();
    } catch {
      return;
    }

    if (!latest) return;

    const current = deployedBuild();
    if (current === latest) {
      pendingBuild = null;
      sessionStorage.removeItem(RELOAD_ATTEMPT_KEY);
      return;
    }

    pendingBuild = latest;
    await applyPendingUpdateIfSafe();
  })().finally(() => {
    runningCheck = null;
  });

  return runningCheck;
}

async function startUpdateManager() {
  await retireLegacyUpdateState().catch(() => {});
  await checkForUpdate();
}

void startUpdateManager();

window.addEventListener('focus', () => {
  void checkForUpdate();
});

window.addEventListener('pageshow', () => {
  void checkForUpdate();
});

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') void checkForUpdate();
});

document.addEventListener('focusout', () => {
  if (!pendingBuild) return;
  setTimeout(() => {
    void applyPendingUpdateIfSafe();
  }, 0);
});
