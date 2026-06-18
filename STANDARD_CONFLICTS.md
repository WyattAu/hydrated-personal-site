# Standard Conflicts

## Active Conflicts

| ID | Standard 1 | Standard 2 | Conflict | Resolution | Status |
|----|-----------|-----------|----------|------------|--------|
| CONF-001 | ADR-005 (brutalist: no rounded corners) | Design Doc §1.1 (amoebic: rounded hover states) | Border-radius contradiction | Brutalist base (0 radius), amoebic hover overrides on interaction only | Resolved |
| CONF-002 | NFR-002 (bundle <110KB/route) | ADR-001 (SolidJS ~15KB + uPlot 48KB) | Budget tight for heavy pages | Lazy-load uPlot via IntersectionObserver, route-specific bundles | Resolved |
| CONF-003 | ADR-015 (Bun) | ADR-010 (Turborepo) | Turborepo docs recommend pnpm | Turborepo works with any package manager including Bun | Resolved |

## Resolved Conflicts

See active conflicts above. No unresolved conflicts at this time.
