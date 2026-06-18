---
title: "Getting Started"
description: "Quick start guide for the Hydrated Personal Site"
order: 1
---
# Getting Started

## Architecture Overview

The site uses a monorepo structure with three main packages:

- **apps/site** - Astro 5 + SolidJS frontend
- **packages/widgets** - Rust/WASM computation widgets
- **worker** - Cloudflare Worker API proxy

## Development Setup

### Prerequisites
- Bun 1.3+
- Rust toolchain with wasm32-unknown-unknown target
- wasm-pack

### Quick Start

```bash
# Install dependencies
bun install

# Start dev server
bun run dev

# Run tests
bunx vitest run
```

## Build

```bash
# Build everything
bun run build

# Build only WASM widgets
cd packages/widgets && bash scripts/build.sh
```
