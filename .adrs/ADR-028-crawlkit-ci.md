# ADR-028: crawlkit CI Integration

| Field | Value |
|-------|-------|
| Status | Accepted |
| Date | 2026-08-27 |
| Deciders | Wyatt Au, Construct |
| Relates to | ADR-011 (Testing Strategy) |

## Context

The existing CI/CD pipeline runs unit tests, property-based tests, E2E tests, and Lighthouse assertions, but lacks automated crawl-based quality checks. Broken links, accessibility violations, performance regressions, and SEO issues can slip through because Lighthouse only audits a single page at a time and the E2E suite focuses on specific user flows rather than comprehensive site-wide crawling.

## Decision

Add `crawlkit` site audit to the CI/CD pipeline:

1. **Automated crawl** — crawlkit crawls the entire site (up to 100 pages) checking links, accessibility, performance, SEO, and content issues.
2. **CI gate** — the crawl runs as part of the CI pipeline; results are stored in `crawl-results.json` for regression tracking.
3. **Issue tracking** — `total_issues` metric enables trend analysis across commits.
4. **Fresh data** — crawl results are updated on each run to reflect the current site state.

## Alternatives Considered

| Alternative | Pros | Cons | Decision |
|-------------|------|------|----------|
| Manual site audits | No setup needed | Inconsistent, slow, easy to skip | Rejected |
| Lighthouse CI only | Already integrated | Single-page, misses cross-page issues | Rejected |
| External service (Siteimprove, Ahrefs) | Comprehensive | Cost, vendor dependency, no CI integration | Rejected |
| crawlkit in CI | Automated, comprehensive, free, CI-native | Adds CI step, crawl time | **Accepted** |

## Consequences

- Catches broken links, a11y violations, and SEO issues automatically on every push.
- `crawl-results.json` provides a machine-readable snapshot for regression detection.
- Crawl time adds ~30-60s to CI (acceptable for comprehensive coverage).
- Foundation for future trend dashboards and quality scorecards.
