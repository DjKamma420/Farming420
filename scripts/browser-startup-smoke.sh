#!/usr/bin/env bash
set -euo pipefail

PORT="${FARMING420_SMOKE_PORT:-4173}"
BASE_URL="http://127.0.0.1:${PORT}/"
HTTP_LOG="${RUNNER_TEMP:-/tmp}/farming420-http.log"
CHROME_LOG="${RUNNER_TEMP:-/tmp}/farming420-chrome.log"
DASHBOARD_DOM="${RUNNER_TEMP:-/tmp}/farming420-dashboard-dom.html"
SETUPS_DOM="${RUNNER_TEMP:-/tmp}/farming420-setups-dom.html"
CHROME_PROCESS_TIMEOUT_SECONDS="${FARMING420_CHROME_TIMEOUT_SECONDS:-45}"

if ! command -v google-chrome >/dev/null 2>&1; then
  echo "google-chrome is required for the browser startup smoke test" >&2
  exit 1
fi

python3 -m http.server "$PORT" --bind 127.0.0.1 >"$HTTP_LOG" 2>&1 &
SERVER_PID=$!
cleanup() {
  kill "$SERVER_PID" 2>/dev/null || true
}
trap cleanup EXIT

for _ in $(seq 1 40); do
  if curl --fail --silent --show-error "$BASE_URL" >/dev/null; then
    break
  fi
  sleep 0.25
done

if ! curl --fail --silent --show-error "$BASE_URL" >/dev/null; then
  echo "Local app server did not become ready" >&2
  cat "$HTTP_LOG" >&2 || true
  exit 1
fi

run_chrome_dump() {
  local url="$1"
  local output="$2"
  : >"$CHROME_LOG"
  set +e
  # GitHub's hosted runner can spend more than 20 seconds cold-starting Chrome
  # before the page receives any virtual time. The page itself still gets only
  # a 5-second virtual-time budget, so a render/event-loop freeze remains a
  # hard failure; the larger outer timeout only avoids mistaking runner startup
  # latency for an application freeze.
  timeout "${CHROME_PROCESS_TIMEOUT_SECONDS}s" google-chrome \
    --headless=new \
    --no-sandbox \
    --disable-gpu \
    --disable-dev-shm-usage \
    --disable-background-networking \
    --disable-component-update \
    --disable-default-apps \
    --disable-extensions \
    --disable-sync \
    --metrics-recording-only \
    --no-first-run \
    --virtual-time-budget=5000 \
    --enable-logging=stderr \
    --log-level=0 \
    --dump-dom "$url" >"$output" 2>"$CHROME_LOG"
  local status=$?
  set -e

  if [[ "$status" -eq 124 ]]; then
    echo "Browser smoke test timed out for $url after ${CHROME_PROCESS_TIMEOUT_SECONDS}s; the app may be stuck in a render/event-loop freeze" >&2
    cat "$CHROME_LOG" >&2 || true
    exit 1
  fi
  if [[ "$status" -ne 0 ]]; then
    echo "Headless Chrome exited with status $status for $url" >&2
    cat "$CHROME_LOG" >&2 || true
    exit "$status"
  fi
}

run_chrome_dump "$BASE_URL" "$DASHBOARD_DOM"

if ! grep -q 'class="app-shell"' "$DASHBOARD_DOM"; then
  echo "The page loaded, but Farming420 never reached its first app-shell render" >&2
  cat "$CHROME_LOG" >&2 || true
  sed -n '1,120p' "$DASHBOARD_DOM" >&2 || true
  exit 1
fi

if ! grep -q 'Your Farming Progress' "$DASHBOARD_DOM"; then
  echo "The app shell rendered, but the default Dashboard content is missing" >&2
  sed -n '1,160p' "$DASHBOARD_DOM" >&2 || true
  exit 1
fi

run_chrome_dump "${BASE_URL}scripts/browser-setups-smoke.html" "$SETUPS_DOM"

if ! grep -q 'Your gear, item by item' "$SETUPS_DOM"; then
  echo "The Setups smoke harness did not reach the Setups page" >&2
  sed -n '1,220p' "$SETUPS_DOM" >&2 || true
  exit 1
fi

if ! grep -q 'data-farming-pet-picker="1"' "$SETUPS_DOM"; then
  echo "The Setups page rendered, but the closed Pet picker is missing" >&2
  sed -n '1,260p' "$SETUPS_DOM" >&2 || true
  exit 1
fi

if ! grep -q 'sb-docked-setup-editor' "$SETUPS_DOM"; then
  echo "The Pet editor exists, but it was not docked below its selected slot" >&2
  sed -n '1,260p' "$SETUPS_DOM" >&2 || true
  exit 1
fi

if grep -q 'MutationObserver' "$SETUPS_DOM"; then
  echo "Unexpected MutationObserver text leaked into the Setups render" >&2
  exit 1
fi

echo "Browser smoke test passed: Dashboard and tool-style Setups picker both render in headless Chrome."
