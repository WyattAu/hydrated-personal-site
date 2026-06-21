#!/bin/bash
set -e
cd "$(dirname "$0")/.."
wasm-pack build --target web --release --out-dir pkg
TARGET_DIR="../../apps/site/public/wasm"
rm -rf "$TARGET_DIR"
mkdir -p "$TARGET_DIR"
cp pkg/hydrated_widgets.js pkg/hydrated_widgets_bg.wasm pkg/hydrated_widgets.d.ts pkg/hydrated_widgets_bg.wasm.d.ts pkg/package.json "$TARGET_DIR/"
