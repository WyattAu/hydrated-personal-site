---
title: Clawdius
description: Remote agentic coding environment with WASM-based sandbox isolation. Uses Linux bubblewrap for read-only system access with full filesystem isolation, enabling safe execution of untrusted code while maintaining performance advantages over traditional containerized approaches.
technologies:
  - Rust
  - WASM
  - Bubblewrap
url: https://github.com/WyattAu/clawdius
featured: true
order: 2
---

Clawdius is a remote agentic coding environment that leverages WASM-based sandbox isolation for safe code execution. It uses Linux bubblewrap for read-only system access with full filesystem isolation, offering significant performance advantages over traditional Docker-containerized approaches.

## Key Features

- **WASM Sandbox** — Isolated execution environment for untrusted code
- **Bubblewrap Isolation** — Lightweight Linux namespaces for filesystem isolation without container overhead
- **Read-Only System Access** — Secure filesystem access patterns for safe code execution
- **Agentic Workflow** — Designed for AI-assisted coding with proper security boundaries
