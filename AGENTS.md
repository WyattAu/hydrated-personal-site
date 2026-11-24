# AGENTS.md — hydrated_personal_site

Personal site: Astro 5 + SolidJS 1.9 + Rust/WASM (packages/widgets),
deployed to Cloudflare Pages + Worker. Fleet rules for AI agents.

## Hard rules

1. **Validation ladder before ship**: `bunx tsc --noEmit` → `biome check`
   → `bun run build` (gated: exit 0 + css link present in every page) →
   E2E (`E2E_PORT=4399`, dedicated server) → deploy → prod verify.
2. **`.forgejo/workflows/ci.yml` is the CI gate** — keep the WASM build,
   verify step, and the dogfood drift report working; `bun run build`
   fails on any page missing its stylesheet (integrity gate).
3. **Never hand-roll estate capabilities.** Before writing anything,
   check `~/dev/src/github.com/WyattAu/` (236 repos) and
   `gh search code --owner WyattAu`. See "Dogfood ledger" below for
   what is already consumed and what was consciously rejected.

## Dogfood ledger

| Capability | Estate source | How consumed |
|---|---|---|
| Solid effects (22 components) | `solid-fx` | vendored jsrepo-style w/ provenance headers; drift report: `bun scripts/fx-drift-check.mjs` (also in CI) |
| Quant math + charts | `plychart` (`plycore`/`plycompute`/`plychart`) | **git deps** in `packages/widgets/Cargo.toml`; `src/quant/mod.rs` re-exports |
| SEO crawl/audit | `crawlkit` | CI: `.forgejo/workflows/crawlkit.yml` (weekly + on page changes) |
| Search canon | `seo-standards` | doctrine; `apps/site/public/docs/seo/SEARCH_STANDARDS_SWEEP.md` is the per-site audit |
| Scaffold/process | `engineering-standards` | `.specs/`, validation ladder, CAPABILITY_MATRIX |

### Consciously rejected (do not re-litigate without new facts)

- `worker-kit` — Rust job supervisor; our worker is a CF Worker (JS) on
  cron triggers. Different medium.
- `shroom-theme` — VS Code editor themes, not web CSS theme tokens.
- `polyfont` — editor font highlighting, not web typography.

### Vendored-code policy

`fx/` components are vendored, not imported (solid-fx is distributed via
a jsrepo registry, not npm). Rules: provenance header stays at top; run
the drift check after touching any fx component; upstream fixes should
be re-vendored deliberately, not hand-merged.

jsrepo consumer config is present (`apps/site/jsrepo.config.mts`,
registry `github/WyattAu/solid-fx`) — but **full jsrepo adoption has a
layout conflict**: solid-fx's registry items declare explicit file
targets (`src/components/<Name>/<Name>.tsx`), which override consumer
path mapping, so `jsrepo add/update` installs blocks in subdirs while
this site vendors them flat in `src/components/solid/fx/`. Adoption
requires either accepting subdir layout (migrate ~20 import paths) or
an upstream solid-fx config change (drop explicit targets). Until then,
re-vendor by hand from `jsrepo list` / upstream sources and run the
drift check.


## Copy rules

1. **No em-dashes.** Em-dashes are an AI-writing tell and are banned in
   all site copy (pages, markdown, llms.txt, OG cards). Use commas,
   colons, or periods; restructure the sentence if needed. Hyphens are
   fine for compound words and ranges.
2. Headlines and card titles: sentence case, no tracked-caps eyebrows,
   no `001 —` numbering.
3. No invented metrics, testimonials, or customer counts.

## Known traps

- **ThemeToggle must not inject inline CSS vars** — `data-theme` only;
  themes.css owns all palette values (an inline fork once shipped black
  + cyan midnight-navy over the gold identity).
- **`pkill`/`pgrep -f` self-match** kills the invoking shell — use
  `[x]` bracket patterns and never put the kill target's literal path
  elsewhere in the same command line.
- **Builds are single-flight** (`flock` in the gated build script) — a
  second build wipes `dist/` mid-run of the first.
- **IndexNow script runs from `apps/site`** (scans `public/` relative
  to cwd).
- **E2E server resolves directory indexes** — `/world` (no slash) must
  serve `/world/index.html`; prod CDN does, the local server must too.
