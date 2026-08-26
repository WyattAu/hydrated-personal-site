# ADR-027: Worker Module Extraction

| Field | Value |
|-------|-------|
| Status | Accepted |
| Date | 2026-08-27 |
| Deciders | Wyatt Au, Construct |
| Relates to | ADR-004 (Deployment CF Pages Workers) |

## Context

The Cloudflare Worker `index.ts` had grown to 1534 lines, containing route definitions, API handlers, middleware, SSE endpoints, WebSocket upgrade logic, and durable object bindings all in a single file. This made the codebase difficult to navigate, test in isolation, and maintain as new endpoints were added.

## Decision

Refactor the monolithic worker into focused modules under `worker/src/`:

- `handlers/` — individual API endpoint handlers (weather, stock, crypto, etc.)
- `middleware/` — rate limiting, circuit breaker, caching, request deduplication
- `durable-objects/` — WebSocket fan-out and session management
- `sse.ts` — Server-Sent Events streaming endpoints
- `websocket.ts` — WebSocket upgrade handling
- `routes.ts` — route table and URL matching
- `index.ts` — thin entry point that wires modules together

## Alternatives Considered

| Alternative | Pros | Cons | Decision |
|-------------|------|------|----------|
| Keep monolithic | No refactoring effort | Hard to navigate, test, and maintain at 1534 lines | Rejected |
| Separate packages per handler | Maximum isolation | Overhead of workspace package per endpoint | Rejected |
| Module extraction within worker/ | Clean separation, same deploy unit, testable in isolation | One-time refactoring cost | **Accepted** |

## Consequences

- Each handler is independently testable without spinning up the full Worker.
- New endpoints can be added by creating a new file and registering it in the route table.
- No runtime behavior change — the Worker bundles the same code at deploy time.
- Improved code navigation and review (diffs are per-module, not per-1534-line-file).
- Foundation for future endpoint-specific middleware and validation.
