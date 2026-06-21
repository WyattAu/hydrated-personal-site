#!/usr/bin/env bash
# Review GUI snapshots produced by the Playwright traversal suite.
#
# Usage:
#   scripts/review-gui-snapshots.sh           # open in default viewer
#   scripts/review-gui-snapshots.sh --diff    # diff against last committed baseline
#
# Snapshots live in `.tmp/gui-review/`. To establish a baseline, run the
# `gui-traversal` Playwright suite once and copy the output into
# `tests/baselines/gui-review/`.

set -euo pipefail

REPO_ROOT="$(git rev-parse --show-toplevel)"
cd "$REPO_ROOT"

SNAPSHOT_DIR=".tmp/gui-review"
BASELINE_DIR="tests/baselines/gui-review"

if [ ! -d "$SNAPSHOT_DIR" ]; then
  echo "No snapshots found at $SNAPSHOT_DIR"
  echo "Run: bunx playwright test tests/e2e/gui-traversal.spec.ts"
  exit 1
fi

mkdir -p "$BASELINE_DIR"

# Count snapshots by type.
full_count=$(find "$SNAPSHOT_DIR" -name "*-full.png" | wc -l)
viewport_count=$(find "$SNAPSHOT_DIR" -name "*-*.png" ! -name "*-full.png" | wc -l)
dom_count=$(find "$SNAPSHOT_DIR" -name "*-dom.json" | wc -l)

echo "Snapshots present:"
echo "  Full-page:    $full_count"
echo "  Per-viewport: $viewport_count"
echo "  DOM JSON:     $dom_count"
echo ""

# DOM drift detection: hash each DOM JSON and compare against baseline.
echo "DOM drift check (against $BASELINE_DIR if present):"
drift=0
for dom_file in "$SNAPSHOT_DIR"/*-dom.json; do
  [ -f "$dom_file" ] || continue
  base="$BASELINE_DIR/$(basename "$dom_file")"
  if [ ! -f "$base" ]; then
    echo "  NEW  $(basename "$dom_file")"
    cp "$dom_file" "$base"
    continue
  fi
  if ! diff -q "$dom_file" "$base" > /dev/null; then
    # Diff ignoring volatile fields (title may include timestamps via SEO).
    if diff <(jq 'del(.title)' "$dom_file") <(jq 'del(.title)' "$base") > /dev/null 2>&1; then
      echo "  ok   $(basename "$dom_file") (title only)"
    else
      echo "  DRIFT $(basename "$dom_file"):"
      diff <(jq 'del(.title)' "$base") <(jq 'del(.title)' "$dom_file") | head -10 | sed 's/^/        /'
      drift=$((drift + 1))
    fi
  else
    echo "  ok   $(basename "$dom_file")"
  fi
done

echo ""
if [ "$drift" -gt 0 ]; then
  echo "Drift detected in $drift DOM snapshot(s)."
  echo "To accept the new state, copy $SNAPSHOT_DIR/*-dom.json into $BASELINE_DIR/."
  exit 2
fi

echo "No drift detected."

# Optional: open snapshots in default viewer (xdg-open on Linux, open on macOS).
if [ "${1:-}" = "--open" ]; then
  if command -v xdg-open > /dev/null; then
    xdg-open "$SNAPSHOT_DIR" > /dev/null 2>&1 || true
  elif command -v open > /dev/null; then
    open "$SNAPSHOT_DIR" || true
  fi
fi
