#!/usr/bin/env bash
set -euo pipefail

PORT="${FARMING420_SMOKE_PORT:-4173}"
BASE_URL="http://127.0.0.1:${PORT}/"
HTTP_LOG="${RUNNER_TEMP:-/tmp}/farming420-http.log"
CHROME_LOG="${RUNNER_TEMP:-/tmp}/farming420-chrome.log"
DOM_OUT="${RUNNER_TEMP:-/tmp}/farming420-dom.html"

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

set +e
timeout 20s google-chrome \
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
  --dump-dom "$BASE_URL" >"$DOM_OUT" 2>"$CHROME_LOG"
CHROME_STATUS=$?
set -e

if [[ "$CHROME_STATUS" -eq 124 ]]; then
  echo "Browser startup smoke test timed out; the app may be stuck in a render/event-loop freeze" >&2
  cat "$CHROME_LOG" >&2 || true
  exit 1
fi

if [[ "$CHROME_STATUS" -ne 0 ]]; then
  echo "Headless Chrome exited with status $CHROME_STATUS" >&2
  cat "$CHROME_LOG" >&2 || true
  exit "$CHROME_STATUS"
fi

if ! grep -q 'class="app-shell"' "$DOM_OUT"; then
  echo "The page loaded, but Farming420 never reached its first app-shell render" >&2
  echo "--- Chrome log ---" >&2
  cat "$CHROME_LOG" >&2 || true
  echo "--- Rendered DOM (first 120 lines) ---" >&2
  sed -n '1,120p' "$DOM_OUT" >&2 || true
  exit 1
fi

if ! grep -q 'Your Farming Progress' "$DOM_OUT"; then
  echo "The app shell rendered, but the default Dashboard content is missing" >&2
  sed -n '1,160p' "$DOM_OUT" >&2 || true
  exit 1
fi

echo "Browser startup smoke test passed: Farming420 reached the Dashboard render in headless Chrome."
