#!/bin/bash
# Fan the per-area sweeps out in parallel. Each area gets its own hard timeout,
# so one hanging page cannot stall the others or the run as a whole.
SP="$(cd "$(dirname "$0")" && pwd)"
PAGES="dashboard account crops tools setups gear pets chips shards buffs pests guide setup planner research coming"
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
