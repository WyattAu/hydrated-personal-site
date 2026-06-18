# ADR-006: Content Management — Astro Content Collections

| Field | Value |
|-------|-------|
| Status | Accepted |
| Date | 2026-06-17 |
| Deciders | Wyatt Au, Construct |
| Relates to | BP-ASTRO-SITE-001 |

## Context

The current site has static content hardcoded in Leptos components. Projects, expertise, and employment data should be in structured content for easy updates.

## Decision

Use **Astro Content Collections** for structured content:
1. **Projects** — Markdown files with frontmatter (name, description, language, repo URL)
2. **Expertise** — Structured data for each skill category
3. **Employment** — Timeline entries with dates and descriptions
4. **Benefits** — Type-safe content, easy updates, future MDX support

## Implementation

```yaml
# content/projects/aileron.md
---
title: Aileron
description: Keyboard-driven web environment
language: Rust
repo: https://github.com/WyattAu/aileron
featured: true
---
```

## Alternatives Considered

| Alternative | Pros | Cons | Decision |
|-------------|------|------|----------|
| Hardcoded content | Simple | Hard to update, no structure | Rejected |
| External CMS | Rich editing | Overkill for personal site | Rejected |
| JSON files | Simple | No Markdown support | Rejected |
| Astro Content Collections | Type-safe, Markdown, easy updates | Newer API | **Accepted** |

## Consequences

- Content updates via git commits (no CMS needed)
- Type-safe content access in components
- Easy to add new projects/pages
- Future-proof for blog/docs migration
