# ADR-018: UI Components — Kobalte

| Field | Value |
|-------|-------|
| Status | Accepted |
| Date | 2026-06-17 |
| Deciders | Wyatt Au, Construct |
| Relates to | BP-SOLIDJS-COMPONENTS-001 |

## Context

The site needs accessible UI components (dropdowns, modals, tabs). Building from scratch is time-consuming and error-prone.

## Decision

Use **Kobalte** for headless UI components:
1. **Accessible** — WCAG 2.1 AA compliant out of the box
2. **Headless** — Unstyled, works with any CSS framework
3. **Solid-native** — Built specifically for SolidJS
4. **Composable** — Mix and match components
5. **Well-documented** — Good API docs and examples

## Components to Use

- `Dialog` — Command palette, modals
- `DropdownMenu` — Navigation menus
- `Tabs` — World monitor sections
- `Select` — ETF timeframe selector
- `Popover` — Tooltips, popovers

## Alternatives Considered

| Alternative | Pros | Cons | Decision |
|-------------|------|------|----------|
| Radix UI | Accessible, popular | React-specific | Rejected |
| Headless UI | Accessible | React/Vue only | Rejected |
| Custom components | Full control | Time-consuming, accessibility risk | Rejected |
| Kobalte | Accessible, Solid-native, headless | Newer | **Accepted** |

## Consequences

- Accessible by default
- Consistent behavior across components
- Less custom code to maintain
- Better keyboard navigation
