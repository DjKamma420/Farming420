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
  # Virtual time is spent by every timer the page waits on. A plain startup dump
  # needs 5s; a harness that drives all thirteen pages needs more, and silently
  # truncating it would dump a half-finished verdict that still greps as OK.
  local virtual_time="${3:-5000}"
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
    --virtual-time-budget="$virtual_time" \
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

if ! grep -q 'Calculated Farming Stats' "$DASHBOARD_DOM"; then
  echo "The app shell rendered, but the current results-only Dashboard content is missing" >&2
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

HELMET_LINE="$(grep 'data-slot="helmet"' "$SETUPS_DOM" | head -n 1 || true)"
if [[ "$HELMET_LINE" != *"rarity-mythic"* || "$HELMET_LINE" != *'data-effective-rarity="MYTHIC"'* ]]; then
  echo "Recombobulated Legendary setup armor did not render with the canonical Mythic rarity background" >&2
  echo "$HELMET_LINE" >&2
  exit 1
fi
if [[ "$HELMET_LINE" == *"rarity-divine"* ]]; then
  echo "Recombobulated setup armor was promoted twice (Legendary -> Mythic -> Divine)" >&2
  echo "$HELMET_LINE" >&2
  exit 1
fi

echo "Browser smoke test passed: Dashboard, Setups picker, and canonical recombobulated rarity background render in headless Chrome."

IDEMPOTENCE_DOM="${RUNNER_TEMP:-/tmp}/farming420-idempotence-dom.html"
run_chrome_dump "${BASE_URL}scripts/browser-idempotence-smoke.html" "$IDEMPOTENCE_DOM" 30000

# The harness reports the page count it actually drove. A verdict without one,
# or with too few pages, means it fell over before testing anything -- which
# must fail rather than read as a pass.
IDEMPOTENCE_VERDICT="$(grep -o 'IDEMPOTENCE_[A-Z]* pages=[0-9]*' "$IDEMPOTENCE_DOM" | head -n 1 || true)"
if [[ -z "$IDEMPOTENCE_VERDICT" ]]; then
  echo "The idempotence harness produced no verdict; it did not finish" >&2
  sed -n '1,80p' "$IDEMPOTENCE_DOM" >&2 || true
  exit 1
fi

IDEMPOTENCE_PAGES="${IDEMPOTENCE_VERDICT##*pages=}"
if (( IDEMPOTENCE_PAGES < 5 )); then
  echo "The idempotence harness only reached $IDEMPOTENCE_PAGES page(s); it is not testing the app" >&2
  sed -n '1,80p' "$IDEMPOTENCE_DOM" >&2 || true
  exit 1
fi

if [[ "$IDEMPOTENCE_VERDICT" != IDEMPOTENCE_OK* ]]; then
  echo "Re-applying the same UI state changed the DOM -- docs/RENDER_FREEZE_SAFETY.md" >&2
  sed -n '1,80p' "$IDEMPOTENCE_DOM" >&2 || true
  exit 1
fi

echo "Idempotence smoke test passed: re-applying the same state on $IDEMPOTENCE_PAGES pages changed nothing."

ITEM_ART_DOM="${RUNNER_TEMP:-/tmp}/farming420-item-art-dom.html"
run_chrome_dump "${BASE_URL}scripts/browser-item-art-smoke.html" "$ITEM_ART_DOM" 20000

ITEM_ART_VERDICT="$(grep -o 'ITEM_ART_[A-Z]* portraits=[0-9]*' "$ITEM_ART_DOM" | head -n 1 || true)"
if [[ -z "$ITEM_ART_VERDICT" ]]; then
  echo "The item art harness produced no verdict; it did not finish" >&2
  sed -n '1,80p' "$ITEM_ART_DOM" >&2 || true
  exit 1
fi

ITEM_ART_PORTRAITS="${ITEM_ART_VERDICT##*portraits=}"
if (( ITEM_ART_PORTRAITS < 5 )); then
  echo "The item art harness only saw $ITEM_ART_PORTRAITS portrait(s); it is not testing coverage" >&2
  sed -n '1,80p' "$ITEM_ART_DOM" >&2 || true
  exit 1
fi

if [[ "$ITEM_ART_VERDICT" != ITEM_ART_OK* ]]; then
  echo "An item portrait is empty -- the precedence chain in docs/ITEM_ART_COVERAGE.md was abandoned" >&2
  sed -n '1,80p' "$ITEM_ART_DOM" >&2 || true
  exit 1
fi

echo "Item art smoke test passed: all $ITEM_ART_PORTRAITS item portraits still hold art."

