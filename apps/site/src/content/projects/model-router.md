---
title: model-router
description: Cost-aware LLM routing core. Per-model pricing tables, USD budget tracking and task-class routing with fallback chains, so agentic workloads pick the cheapest model that can do the job.
technologies:
  - Rust
  - LLM
url: https://github.com/WyattAu/model-router
featured: true
order: 4
---

LLM spend grows silently when every call defaults to the flagship model. model-router makes routing and budgets explicit infrastructure.

## Key Features

- **Per-model pricing** — Versioned price tables for input/output tokens across providers
- **USD budget tracking** — Running spend ledgers with caps that fail closed
- **Task-class routing** — Classify the task, route to the cheapest capable model
- **Fallback chains** — Ordered failover when a provider errors or rate-limits
