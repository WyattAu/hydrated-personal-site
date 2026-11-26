# Postmortems

Deviations and incidents, recorded in the defence deviation-document
structure: **trigger → root cause → impact → fix → gate added**. A gate
is what mechanically prevents recurrence; if a postmortem adds no gate,
say why.

## Index

| Date | Incident | Gate added |
|---|---|---|
| 2026-11-20 | [2026-11-20-build-race.md](2026-11-20-build-race.md) | flock single-flight; dist integrity gate |
| 2026-11-20 | [2026-11-20-css-pipeline.md](2026-11-20-css-pipeline.md) | themes.css import in BaseLayout; stylesheet integrity gate |
| 2026-11-25 | [2026-11-25-tailwind-plugin.md](2026-11-25-tailwind-plugin.md) | utility-gate in the gated build; diagnostic-restore rule |

## Template

```markdown
# <date> — <title>

## Trigger
What set the incident in motion (external event, not the mistake).

## Root cause
The mistake itself. Be specific; name the file and the line of reasoning.

## Impact
What shipped/broke/leaked, and for how long.

## Fix
What was changed, where.

## Gate
What mechanically prevents recurrence. If nothing can, state why the
risk is accepted.
```
