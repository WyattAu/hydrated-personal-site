# 2026-11-20 — CSS pipeline regression (unstyled pages on prod)

## Trigger
The r44 round added four new pages while the global stylesheet was
imported per-page, not centrally. The new pages were written without
the per-page import.

## Root cause
`styles/base.css` (Tailwind + tokens + component classes) and
`styles/animations.css` were imported by individual pages; `BaseLayout`
never imported them. Pages written without the import built fine
(Astro does not require CSS) and served with **no styling**:
`/data` and all three `/insights` pages were unstyled on production,
live since their respective ships (r26–r29). Detected during the
design-review screenshot pass (2026-11-24), not at ship time.

### False root cause (recorded for honesty)
The first hypothesis was "a partial dist shipped from an interrupted
build." A complete, exit-0 build reproduced the defect deterministically
— disproving it. The integrity gate then exposed the real cause. Lesson:
a gate that only checks file presence cannot distinguish a broken
artifact from an incomplete one; integrity checks must assert content,
not existence.

## Impact
Four pages on production rendered with no styling for 26–29 days. No
functional breakage (HTML semantics intact; SEO schemas present), but
the pages were effectively unusable for human visitors and would have
damaged the citability goal if indexed that way.

## Fix
`BaseLayout.astro` now imports `../styles/base.css` and
`../styles/animations.css` directly — the style pipeline is owned by
the layout. Vite deduplicates the per-page imports that remain.

## Gate
1. The gated build asserts a stylesheet link is present in **every**
   content page (existence-of-file was the insufficient gate).
2. The design-review pass now includes a screenshot of every new page
   before deploy.

## Follow-up
The sweep also surfaced the sibling defect family: any future global
style layer must be imported in exactly one owned place (the layout),
never per-page.
