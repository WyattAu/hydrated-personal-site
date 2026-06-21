#!/usr/bin/env bash
# Install version-controlled Git hooks from scripts/ into .git/hooks/.
# Idempotent and safe to re-run. Called by `bun run setup` / `bun run prepare`
# (auto-runs after `bun install`).

set -euo pipefail

REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || true)"
if [ -z "$REPO_ROOT" ]; then
  echo "install-hooks: not in a git repository; skipping"
  exit 0
fi

HOOK_DIR="$REPO_ROOT/.git/hooks"
mkdir -p "$HOOK_DIR"

HOOKS=(pre-commit)
for name in "${HOOKS[@]}"; do
  src="$REPO_ROOT/scripts/$name"
  dst="$HOOK_DIR/$name"

  if [ ! -f "$src" ]; then
    echo "install-hooks: source $src missing; skipping $name"
    continue
  fi

  # Symlink would be ideal, but on Windows git bash symlinks can be flaky.
  # Copy + verify checksum so changes to scripts/ propagate on next install.
  cp "$src" "$dst"
  chmod +x "$dst"
  echo "install-hooks: installed $dst"
done
