# Design decision register

Decisions that are FINAL. Do not re-implement, re-add, or re-propose
these without an explicit new request from Wyatt.

| Date | Decision | Context |
|---|---|---|
| 2026-11-25 | **No CV button** on the site (hero CTAs, header, footer, anywhere) | Removed repeatedly after multiple requests. The CV lives at `ocis.wyattau.com/s/...` if a direct link is ever needed again, but the button stays off. The contact section (email) is the response path. |
| 2026-11-25 | **No GlassIcons component** | Evaluated 4 times, no natural slot. |
| 2026-11-25 | **No em-dashes** in any site copy | AI-writing tell; see AGENTS.md copy rules. |
| 2026-11-25 | **No dead-numeric ticker timestamps** ("updated HH:MM:SS") in the TickerBar | Out of theme; a quiet "live" marker carries the signal. |
| 2026-11-25 | **Generated imagery policy** | Generated art = decorative/abstract only (navy+gold identity). Documentary slots (/uses, dossier photos) reserved for real photos. |
| 2026-11-25 | **WASM_VERSION build-derived** (`b-${BUILD_ID}`) | Never hardcode version strings that feed cache keys — SW cache-first made stale glue+wasm permanent. |

## Also recorded (mechanism decisions)

- **CSS pipeline owned by BaseLayout**: base.css + themes.css +
  animations.css imported exactly there, never per-page. (CSS
  postmortem, 2026-11-20.)
- **Theme switching is attribute-only**: `data-theme` on `<html>`;
  no inline-var injection from ThemeToggle. (Theme fork incident.)
- **Diag-restore rule**: any diagnostic config change is restored
  before the next build that ships, or verified with a content
  assertion. (Tailwind plugin incident.)
