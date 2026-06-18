# Phase 8: Execution Graph — Report

**Status:** Complete
**Date:** 2025-01-15
**Author:** Zeitgeist (Brand Strategist, Project Manager, Operations Engineer)

---

## Deliverable

| Artifact | Location | Status |
|----------|----------|--------|
| Master Plan (TOML) | `.specs/08_roadmap/master_plan.toml` | ✅ Complete |

---

## Plan Summary

### Task Count by Phase

| Phase | Name | Tasks | Hours |
|-------|------|-------|-------|
| 0 | Foundation | 7 | 20h |
| 1 | Core Pages | 11 | 25h |
| 2 | World Monitor | 10 | 42h |
| 3 | ETF Intelligence | 8 | 26h |
| 4 | WASM Widgets | 17 | 96h |
| 5 | Polish | 6 | 18h |
| 6 | Launch | 5 | 8h |
| **Total** | | **64 tasks** | **235h** |

### Critical Path

```
P0-01 (Init Astro) → P0-05 (Port APIs) → P1-01 (BaseLayout) → P1-06 (Nav) →
P2-01 (World Layout) → P2-03 (Leaflet Map) → P4-01 (wasm-pack) → P4-16 (Integration) →
P5-01 (Visual Audit) → P5-03 (Lighthouse) → P6-01 (Deploy)
```

**Estimated critical path duration:** ~120h

### Parallelization Opportunities

| Track | Phases | Can Run In Parallel |
|-------|--------|-------------------|
| Pages + World | P1 → P2 | After P1-01 completes, P2-01 can start |
| Pages + ETF | P1 → P3 | After P1-01 completes, P3-01 can start |
| Pages + WASM | P1 → P4 | After P1-01 completes, P4-01 can start |
| World + ETF | P2 ∥ P3 | Fully parallel after P1-01 |
| World + WASM | P2 ∥ P4 | Fully parallel after P1-01 |
| ETF + WASM | P3 ∥ P4 | Fully parallel after P1-01 |

**Optimal parallel schedule:** 3 developers
- Dev A: P0 → P1 → P2 (World Monitor) → P5 → P6
- Dev B: P0 → P1 → P3 (ETF Intelligence) → P5 → P6
- Dev C: P0 → P1 → P4 (WASM Widgets) → P5 → P6

With 3 developers: ~140h wall clock (vs 235h serial)

### Effort Distribution

```
Phase 0: ████ (20h, 8.5%)
Phase 1: █████ (25h, 10.6%)
Phase 2: █████████ (42h, 17.9%)
Phase 3: █████ (26h, 11.1%)
Phase 4: ████████████████████ (96h, 40.9%)
Phase 5: ████ (18h, 7.7%)
Phase 6: ██ (8h, 3.4%)
```

WASM widgets (Phase 4) represent 41% of total effort — the largest single phase.

---

## Dependency Validation

### No Circular Dependencies

Verified: all task prerequisites form a DAG (directed acyclic graph). No cycles detected.

### Minimum Prerequisites Per Phase

| Phase | Minimum Prerequisites |
|-------|----------------------|
| Phase 0 | None |
| Phase 1 | P0-01, P0-02 (Astro + Tailwind) |
| Phase 2 | P1-01 (BaseLayout) |
| Phase 3 | P1-01 (BaseLayout) |
| Phase 4 | P0-01, P1-01 (Astro + BaseLayout) |
| Phase 5 | P4-16 (all widgets integrated) |
| Phase 6 | P5-04, P5-05, P5-06 (polish complete) |

### Blocking Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| P0-05 (Port APIs) delays P2, P3 | High | APIs are framework-agnostic, port independently |
| P4-01 (wasm-pack) blocks all widgets | High | Set up wasm-pack pipeline early |
| P5-03 (Lighthouse) reveals performance issues | Medium | Build performance budgets into Phase 1 |
| P6-01 (CF Pages) deployment issues | Medium | Test deployment in Phase 0 with skeleton |

---

## Validation Against Source Documents

| Source Document | Coverage |
|----------------|----------|
| requirements.md §2.1 (Pages) | ✅ All 9 routes covered in Phase 1 + Phase 2 + Phase 3 |
| requirements.md §2.2 (Interactive Features) | ✅ Theme, nav, command palette, world monitor, ETF, guestbook |
| requirements.md §2.3 (API Endpoints) | ✅ All 16 endpoints covered in Phase 0 Task 0.5 |
| requirements.md §2.4 (Data Sources) | ✅ All proxied through CF Worker |
| requirements.md §3 (Non-Functional) | ✅ Phase 5 covers performance, accessibility, SEO |
| architecture.md §1.3 (WASM Widgets) | ✅ All 13 widgets covered in Phase 4 |
| plan.md (Original Plan) | ✅ Extended with more granularity, TOML format, verification criteria |

---

## Recommendations

1. **Start wasm-pack setup (P4-01) immediately** — it blocks all 13 widgets
2. **Port APIs (P0-05) early** — unblocks World Monitor and ETF Intelligence
3. **Run World Monitor and ETF tracks in parallel** — no interdependencies
4. **Budget 20% buffer on WASM widgets** — estimation uncertainty is highest here
5. **Run Lighthouse checks weekly** — catch performance regressions early
