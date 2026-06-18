---
title: "Architecture"
description: "System architecture and design decisions"
order: 2
---
# Architecture

## Design Philosophy

Two composited design systems:

### Spatial Materialism
Physical depth through layered z-index system. Consistent shadow source (top-left). Material textures and letterboxing on ultra-wide displays.

### Amoebic UI
Organic interaction patterns. Buttons and cards morph from rigid rectangles to fluid blob-like shapes on hover using cubic-bezier easing.

## Component Architecture

### Frontend
- **Astro** - Static site generation with islands architecture
- **SolidJS** - Reactive UI components (18 total)
- **Tailwind CSS 4** - Utility-first styling with custom theme system

### WASM Widgets
13 standalone Rust/WASM modules for client-side computation:
- Science: Fourier, Cellular Automata, Climate, Physics
- Finance: Order Book, Treemap, BTC Health, Correlation, Backtest
- DevTools: Regex, Network
- Creative: Generative Art, Color Blindness

### Backend
- **Cloudflare Workers** - Edge compute for API proxy
- **Cloudflare KV** - Persistent guestbook storage
- **20 API endpoints** with in-memory caching and circuit breakers

## Security Model
- CSP headers (nonce-ready)
- CORS on all API responses
- Rate limiting on all endpoints
- Input sanitization for user content
- Honeypot fields for bot detection
