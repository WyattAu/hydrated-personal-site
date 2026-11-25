# 2026-11-20 — Build race and partial dist deploy

## Trigger
Two gated builds were launched concurrently during a period of frequent
harness restarts. The second build wiped `dist/` (standard build output
cleaning) while the first was mid-run, and a deploy fired against the
wrecked intermediate state.

## Root cause
Two defects compounding:
1. The gated build script had no single-flight lock — nothing prevented
   a second instance from starting while the first ran.
2. The deploy step gated on **file existence** (`test -f dist/insights/
   index.html`), not artifact integrity. A mid-wipe dist satisfied it.
Additionally, the harness restarts killed the first build's parent shell
but orphaned its child process, which kept running (slowly, starved)
and later produced an incomplete tree.

## Impact
One wrangler deploy shipped a partial dist (two insight pages missing
their CSS bundles — see the sibling postmortem for the second defect the
confusion initially masked). No data loss; redeploy of the verified
complete dist healed it within the hour.

## Fix
1. `flock` single-flight lock on the gated build script: a second
   instance aborts instead of racing.
2. The gated build now fails loudly (`fail=1` + GATE: FAIL) if any
   integrity check fails, and the deploy step refuses to run unless the
   gate passed.
3. Verified-complete redeploy after the fix.

## Gate
- flock single-flight in the build script.
- Integrity gate: stylesheet link required in every content page,
  WASM size ceiling, exit-code check.

## Follow-up
Any future gate added to the build script must set `fail=1` and be
checked by the central GATE evaluation — presence-only checks are
forbidden (see the sibling postmortem's false-root-cause lesson).
