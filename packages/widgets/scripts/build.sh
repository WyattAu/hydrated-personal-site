#!/bin/bash
set -e
cd "$(dirname "$0")/.."
wasm-pack build --target web --release --out-dir pkg
mkdir -p ../../apps/site/public/wasm
cp -r pkg/ ../../apps/site/public/wasm/
