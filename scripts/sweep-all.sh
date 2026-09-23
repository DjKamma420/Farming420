#!/bin/bash
# Fan the per-area sweeps out in parallel. Each area gets its own hard timeout,
# so one hanging page cannot stall the others or the run as a whole.
SP="$(cd "$(dirname "$0")" && pwd)"
# The page list is read out of the app, not kept here by hand.
#
# The hardcoded list had drifted badly: it swept five pages that no longer exist
# (account, guide, setup, research, coming) and never swept four that do
# (accessories, qol, info, focus) -- including the two largest content pages. A
# sweep that silently skips a third of the app is worse than none, because it
# reads as coverage.
PAGES="$(node -e '
  const fs = require("fs");
  const source = fs.readFileSync(process.argv[1], "utf8");
  const nav = source.match(/const NAV = \[([\s\S]*?)\];/);
  if (!nav) { console.error("sweep: could not find NAV in app.js"); process.exit(1); }
  const ids = [...nav[1].matchAll(/\[.([a-z0-9-]+)./g)].map(m => m[1]);
  if (ids.length < 8) { console.error("sweep: only found " + ids.length + " pages in NAV"); process.exit(1); }
  process.stdout.write(ids.join(" "));
' "$SP/../src/app.js")" || exit 1
OUT="${SWEEP_OUT:-${TMPDIR:-/tmp}/farming420-sweep}"
mkdir -p "$OUT"
rm -f "$OUT"/area-*.log
run_one() {
  local page="$1"
  timeout -k 5 150 node "$SP/sweep-area.mjs" "$page" > "$OUT/area-$page.log" 2>&1
  local code=$?
  case $code in
    0) echo "PASS  $page" ;;
    2) echo "BUDGET $page" ;;
    124|137) echo "KILLED $page (hit the 150s wall)" ;;
    *) echo "FAIL  $page (exit $code)" ;;
  esac
}
export -f run_one
export SP OUT SWEEP_URL
echo "$PAGES" | tr ' ' '\n' | xargs -P "${SWEEP_JOBS:-4}" -I{} bash -c 'run_one {}'
echo "logs: $OUT"
