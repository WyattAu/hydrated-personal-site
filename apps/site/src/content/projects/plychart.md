---
title: plychart
description: High-performance WASM charting library for Rust. Renders candles, heatmaps, gauges, vol surfaces and correlation matrices to canvas, with a framework-agnostic zoom/pan interaction state machine and a JSON API consumed by SolidJS islands.
technologies:
  - Rust
  - WASM
  - TypeScript
  - SolidJS
url: https://github.com/WyattAu/plychart
featured: true
order: 1
---

A charting library built for dashboards that need native-speed rendering in the browser. Every chart on this site — the trading terminal, the quant lab, the world monitor — renders through plychart.

## Key Features

- **Canvas renderers** — Line, area, candles, bars, scatter, heatmap, correlation, gauge, histogram, radar, fan charts and more
- **Interaction state machine** — Framework-agnostic zoom/pan viewport driven by DOM events, with proportional center-anchored zoom
- **JSON API** — SolidJS islands pass data as JSON; Rust parses, lays out and draws, returning viewport windows for re-slicing
- **Quant compute core** — Backtests, Black-Scholes Greeks, SVI vol surfaces, copulas, Monte Carlo and risk metrics alongside the renderers
