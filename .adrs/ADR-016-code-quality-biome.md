# ADR-016: Code Quality — Biome

| Field | Value |
|-------|-------|
| Status | Accepted |
| Date | 2026-06-17 |
| Deciders | Wyatt Au, Construct |
| Relates to | All Blue Papers |

## Context

The project needs consistent code formatting and linting. ESLint + Prettier is the traditional choice but Biome is faster and simpler.

## Decision

Use **Biome** for linting + formatting:
1. **Rust-powered** — 10-35x faster than ESLint + Prettier combined
2. **Single tool** — Replaces both ESLint and Prettier
3. **Zero config** — Works out of the box for TypeScript
4. **Better diagnostics** — Clear error messages with fix suggestions
5. **Consistent** — Same rules for formatting and linting

## Alternatives Considered

| Alternative | Pros | Cons | Decision |
|-------------|------|------|----------|
| ESLint + Prettier | Mature, extensive plugins | Two tools, slow | Rejected |
| Deno fmt | Fast | Deno-specific | Rejected |
| dprint | Fast | Less ecosystem | Considered |
| Biome | Fastest, single tool, Rust-powered | Newer | **Accepted** |

## Consequences

- No `.eslintrc` or `.prettierrc` files
- `biome check .` replaces `eslint . && prettier --check .`
- Faster CI/CD (linting in <100ms)
- Same code style across all files
