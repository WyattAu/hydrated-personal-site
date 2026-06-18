# ADR-015: Package Manager — Bun

| Field | Value |
|-------|-------|
| Status | Accepted |
| Date | 2026-06-17 |
| Deciders | Wyatt Au, Construct |
| Relates to | All Blue Papers |

## Context

The project needs fast package installs and builds. pnpm is good but Bun is significantly faster.

## Decision

Use **Bun** for package management and runtime:
1. **10x faster installs** — Content-addressable store with native binary
2. **Built-in bundler** — No need for separate esbuild/Vite config
3. **Native TypeScript** — No ts-node or tsx needed
4. **Built-in test runner** — Can replace Vitest for simple tests
5. **Node.js compatible** — Drop-in replacement for npm/pnpm

## Alternatives Considered

| Alternative | Pros | Cons | Decision |
|-------------|------|------|----------|
| npm | Built-in | Slow, large node_modules | Rejected |
| pnpm | Fast, efficient | Slower than Bun | Rejected |
| Yarn | Fast | Complex, Berry issues | Rejected |
| Bun | Fastest, built-in tools | Newer | **Accepted** |

## Consequences

- `bun install` instead of `pnpm install`
- `bun run dev` instead of `pnpm dev`
- Faster CI/CD pipelines
- Same lockfile format (bun.lock)
