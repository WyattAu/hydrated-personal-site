# ADR-025: WebSocket/SSE Real-Time Streaming

| Field | Value |
|-------|-------|
| Status | Accepted |
| Date | 2026-08-27 |
| Deciders | Wyatt Au, Construct |
| Relates to | ADR-004 (Deployment CF Pages Workers) |

## Context

The `/world` and `/etf` dashboards currently poll upstream APIs at 10-60 second intervals. This introduces unnecessary latency for time-sensitive data (crypto prices, fear/greed index, earthquake alerts) and wastes bandwidth when no new data is available. Clients repeatedly fetch identical responses during quiet periods.

## Decision

Add WebSocket and Server-Sent Events (SSE) support for real-time data streaming:

1. **Cloudflare Durable Objects** for WebSocket fan-out — each connected client gets a Durable Object that manages upstream connections and broadcasts to all subscribers.
2. **SSE fallback** for clients that cannot maintain WebSocket connections (e.g., restrictive proxies, HTTP/2-only environments).
3. **Topic-based subscription** — clients subscribe to specific data channels (e.g., `crypto-prices`, `market-metrics`) rather than receiving all updates.
4. **Graceful degradation** — if WebSocket drops, the client automatically falls back to polling at the original interval.

## Alternatives Considered

| Alternative | Pros | Cons | Decision |
|-------------|------|------|----------|
| Polling only | Simple, no infra changes | 10-60s latency, wasted bandwidth | Rejected |
| SSE only | Simple, HTTP-compatible | One-directional, no binary data, connection limits | Rejected (as sole solution) |
| External service (Ably, Pusher) | Managed, reliable | Cost, vendor lock-in, adds external dependency | Rejected |
| WebSocket + Durable Objects | Real-time, Cloudflare-native, topic-based | Requires Durable Object binding, adds complexity | **Accepted** |
| WebSocket + SSE fallback | Covers all client types, graceful degradation | Slightly more code to maintain both paths | **Accepted** |

## Consequences

- Eliminates polling lag — clients receive updates within milliseconds of upstream data changing.
- Adds Durable Object binding requirement to `wrangler.toml` and deployment.
- Increases Worker code complexity (WebSocket upgrade handling, session management).
- SSE endpoint provides compatibility for environments where WebSocket is unavailable.
- Foundation for future L2 order book streaming and HFT microstructure visualizations.
