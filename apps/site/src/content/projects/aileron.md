---
title: Aileron
description: A blazingly fast, keyboard-driven web environment built in Rust with the Servo rendering engine. Features native window tiling, Lua-configurable keybindings, zero-extension ad-blocking via request filtering, and an integrated AI MCP server that allows LLMs to observe and interact with web content. Designed to be a performant alternative to Electron-based browsers.
technologies:
  - Rust
  - Servo
  - Lua
url: https://github.com/WyattAu/aileron
featured: true
order: 1
---

Aileron is a keyboard-driven web environment built in Rust on top of the Servo rendering engine. It replaces the Electron-based browser paradigm with a native, performant alternative that prioritizes keyboard interaction and developer workflows.

## Key Features

- **Native Window Tiling** — Split and arrange browser windows with keyboard shortcuts, no mouse required
- **Lua-Configurable Keybindings** — Full Lua scripting for custom keymaps and workflows
- **Zero-Extension Ad Blocking** — Built-in request filtering eliminates the need for extension-based ad blockers
- **AI MCP Server** — Integrated Model Context Protocol server allowing LLMs to observe and interact with web content
- **Memory Efficient** — Native Rust implementation with a fraction of Electron's memory footprint
