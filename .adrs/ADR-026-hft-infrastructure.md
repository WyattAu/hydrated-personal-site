# ADR-026: HFT-Grade Infrastructure

| Field | Value |
|-------|-------|
| Status | Accepted |
| Date | 2026-08-27 |
| Deciders | Wyatt Au, Construct |
| Relates to | ADR-003 (Rust WASM Standalone) |

## Context

The quant library (`packages/widgets/src/quant/`) provides correct algorithm implementations but lacks the performance infrastructure needed for real-time streaming and high-frequency data processing. Without lock-free data structures, binary serialization, and SIMD-optimized numerics, the WASM modules cannot efficiently handle the throughput required for live market data streaming.

## Decision

Add HFT-grade performance infrastructure to the WASM widget crate:

1. **Lock-free SPSC ring buffer** (`data_structures/ring_buffer.rs`) — zero-copy single-producer single-consumer queue for streaming price data between WASM and SolidJS.
2. **Binary serialization** — compact wire format for quant data transfer, avoiding JSON overhead on hot paths.
3. **SIMD-optimized numerics** — vectorized portfolio math, correlation matrix computation, and risk calculations using Rust's `std::simd` (nightly) or platform intrinsics.
4. **Criterion benchmarks** (`benches/quant_benchmarks.rs`) — verifiable performance baselines for all critical code paths.

## Alternatives Considered

| Alternative | Pros | Cons | Decision |
|-------------|------|------|----------|
| Do nothing | Quant lib is sufficient for a personal site | Cannot handle real-time streaming, no verifiable performance | Rejected |
| JSON serialization only | Simple, debuggable | High overhead on hot paths, blocks streaming | Rejected |
| Use existing Vec/deque | Already in std | Not lock-free, allocation overhead | Rejected |
| Lock-free ring buffer + binary serde + SIMD | Zero-copy, verifiable perf, streaming-ready | Nightly Rust for SIMD, more complexity | **Accepted** |

## Consequences

- Enables real-time WebSocket streaming with sub-millisecond WASM-to-DOM latency.
- Criterion benchmarks provide regression detection for performance-critical code.
- SIMD optimizations reduce portfolio computation time by 4-8x for large datasets.
- Nightly Rust requirement for `std::simd` (gated behind feature flag, falls back to scalar).
- Foundation for future L2 order book visualization and advanced quant widgets.
