# ADR-010: Monorepo Structure — Turborepo

| Field | Value |
|-------|-------|
| Status | Accepted |
| Date | 2026-06-17 |
| Deciders | Wyatt Au, Construct |
| Relates to | BP-ASTRO-SITE-001, BP-CF-WORKER-001, BP-WASM-WIDGETS-001 |

## Context

The project has multiple packages (Astro site, CF Worker, WASM widgets). They need to be managed together.

## Decision

Use **Turborepo** for monorepo orchestration:
1. **Single repository** — All code in one repo
2. **Workspace packages** — `apps/site`, `worker/`, `packages/widgets/`
3. **Shared dependencies** — pnpm workspaces
4. **Build caching** — Turborepo caches WASM builds separately
5. **Parallel execution** — Independent tasks run in parallel

## Structure

```
hydrated_personal_site/
├── apps/site/          # Astro + SolidJS
├── worker/             # CF Worker
├── packages/widgets/   # Rust WASM
├── turbo.json          # Pipeline config
└── pnpm-workspace.yaml
```

## Alternatives Considered

| Alternative | Pros | Cons | Decision |
|-------------|------|------|----------|
| npm workspaces | Built-in | Slower, less features | Rejected |
| Lerna | Mature | Complex, slower | Rejected |
| Nx | Powerful | Heavy, complex config | Rejected |
| Turborepo | Fast, simple, cached | Newer | **Accepted** |

## Consequences

- Single `pnpm install` for all dependencies
- `turbo build` builds everything in correct order
- WASM builds cached separately from site builds
- Easy to add new packages
