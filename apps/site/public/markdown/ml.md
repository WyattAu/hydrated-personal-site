# ML Intelligence — LLM benchmarks and tools

LLM benchmark leaderboards, model comparison radar charts, ArXiv paper
feeds, GPU requirement calculator, and inference throughput simulator for
AI and machine learning engineers.

## What can I do on the ML Intelligence page?

- Compare LLM benchmark leaderboards across providers and tasks.
- Overlay models on comparison radar charts.
- Read recent ArXiv paper feeds relevant to ML engineering.
- Estimate GPU requirements for serving a model at a target context and
  batch size.
- Simulate inference throughput (tokens/s) across hardware profiles.

All quantitative computation runs client-side in Rust/WebAssembly — no
server round-trips, no data collection.

## Frequently asked questions

**What does the GPU requirement calculator cover?** Serving estimates across hardware profiles for a target model context and batch size — VRAM, parameter counts, and quantization tradeoffs.

**Where do the LLM benchmarks come from?** Publicly reported benchmark scores aggregated into leaderboards with model comparison radar charts, served via the site Worker API.

**Is the throughput simulator real inference?** No — it is a client-side WebAssembly simulation of inference throughput across hardware profiles, not live model serving.
