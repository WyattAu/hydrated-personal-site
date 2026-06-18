# Capability Matrix

## Required vs Available Capabilities

| Capability | Required | Available | Status | Notes |
|------------|----------|-----------|--------|-------|
| Node.js 18+ | Yes | Yes | OK | Bun available |
| Bun 1.0+ | Yes | Yes | OK | Package manager + runtime |
| Rust 1.83+ | Yes | Yes | OK | WASM compilation |
| wasm-pack | Yes | TBD | CHECK | Need `wasm-pack --version` |
| wasm-opt | Yes | TBD | CHECK | Binaryen, optional |
| Astro 5.x | Yes | TBD | PENDING | Will be installed via Bun |
| SolidJS 1.9 | Yes | TBD | PENDING | Will be installed via Bun |
| Tailwind CSS 4 | Yes | TBD | PENDING | Will be installed via Bun |
| Biome | Yes | TBD | PENDING | Will be installed via Bun |
| Turborepo | Yes | TBD | PENDING | Will be installed via Bun |
| Vitest | Yes | TBD | PENDING | Will be installed via Bun |
| Playwright | Yes | TBD | PENDING | Will be installed via Bun |
| Lean4 | Optional | TBD | CHECK | For formal verification |
| wrangler | Yes | TBD | CHECK | CF CLI for deployment |
| Git | Yes | Yes | OK | Version control |
| Cloudflare Account | Yes | Yes | OK | Deployment target |

## Tool Version Requirements

File: `.specs/00_requirements/tool_requirements.toml`

```toml
[tools.node]
min_version = "18.0.0"
check_cmd = "node --version"

[tools.bun]
min_version = "1.0.0"
check_cmd = "bun --version"

[tools.rust]
min_version = "1.83.0"
check_cmd = "rustc --version"

[tools.wasm_pack]
min_version = "0.12.0"
check_cmd = "wasm-pack --version"

[tools.astro]
min_version = "5.0.0"
install = "bun add astro@latest"

[tools.solidjs]
min_version = "1.9.0"
install = "bun add solid-js@latest"

[tools.tailwind]
min_version = "4.0.0"
install = "bun add tailwindcss@latest"

[tools.biome]
min_version = "1.0.0"
install = "bun add @biomejs/biome@latest"

[tools.turbo]
min_version = "2.0.0"
install = "bun add turbo@latest"

[tools.vitest]
min_version = "1.0.0"
install = "bun add vitest@latest"

[tools.playwright]
min_version = "1.40.0"
install = "bun add @playwright/test@latest"

[tools.wrangler]
min_version = "3.0.0"
check_cmd = "wrangler --version"
```
