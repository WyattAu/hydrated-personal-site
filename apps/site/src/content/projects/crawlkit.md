---
title: crawlkit
description: Site crawl kit in Rust. Crawls, analyzes and stores SEO and content signals for whole sites, with a WASM build that powers the live SEO audit dashboard on this site.
technologies:
  - Rust
  - WASM
  - SEO
url: https://github.com/WyattAu/crawlkit
featured: true
order: 3
---

A toolkit for crawling websites and turning raw pages into structured, queryable audit data — headings, meta, links, performance signals and content issues.

## Key Features

- **Analyzer pipeline** — Pluggable analyzers for SEO, meta tags, headings, links and content quality
- **Content-addressed storage** — BLAKE3-addressed page store with redirect-chain tracking
- **WASM target** — Runs fully client-side; the SEO dashboard on this site audits pages in your browser
- **JSON reports** — Machine-readable findings feed dashboards and CI gates
