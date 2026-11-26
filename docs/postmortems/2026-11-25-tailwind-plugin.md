# 2026-11-25 — Tailwind plugin lost in diagnostic (layout collapse)

## Trigger
A Lean-spec debugging session removed the `tailwindcss()` Vite plugin
from `astro.config.mjs` as a diagnostic and was interrupted (server
restart) before restoring it.

## Root cause
A diagnostic configuration change survived into shipped builds: every
build after the edit emitted CSS with theme tokens but **zero Tailwind
utility classes** — flex/grid/padding/spacing all dead, full layout
collapse on every page. The gated build passed because its checks were
existence-based (stylesheet link present, theme blocks present) —
neither asserted that the *utilities* were present.

## Impact
Full layout collapse on every page of production, observed by the
owner directly. Duration: from the first post-diagnostic deploy until
the fix (same day).

## Fix
`plugins: [tailwindcss()]` restored; rebuilt; utilities verified in
the emitted CSS; deployed; live bundle verified.

## Gate
Utility-gate added to the gated build script: the emitted CSS must
contain Tailwind utilities (`pt-32`/`max-w-7xl` presence) or the build
fails. Lesson recorded: **a diagnostic configuration change is
deployable state — restore it before any build that will ship, or
verify with a content assertion, not just exit codes.**
