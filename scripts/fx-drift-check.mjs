#!/usr/bin/env bun
/**
 * solid-fx drift guard: the apps/site fx/ components are vendored
 * (jsrepo-style) from WyattAu/solid-fx. This check normalizes both sides
 * (strip comments/whitespace) and flags files whose upstream counterpart
 * diverged — so upstream fixes surface instead of silently forking.
 *
 * Mapping heuristic: site ComponentName.tsx <-> upstream kebab-case name.
 * Components with real local adaptations are declared in LOCAL_ADAPTATIONS.
 */
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const UPSTREAM =
  process.env.SOLID_FX_SRC ?? '/home/wyatt/dev/src/github.com/WyattAu/solid-fx/src/content';
const LOCAL = new URL('../apps/site/src/components/solid/fx/', import.meta.url).pathname;

// files with intentional local divergences (theme-aware wrappers etc.)
const LOCAL_ADAPTATIONS = new Set([
  'theme.ts',
  'ThemeCrosshair.tsx',
  'ThemeDotField.tsx',
  'ThemeElectricBorder.tsx',
  'ThemeRadar.tsx',
  'SiteDock.tsx',
  'Aurora.tsx',
  'TechLoop.tsx',
  // intentional local rewrites (same name, different component):
  'Counter.tsx',
  'CountUp.tsx',
  'Radar.tsx',
]);

const kebab = (s) =>
  s
    .replace(/\.tsx?$/, '')
    .replace(/(?<=[a-z0-9])([A-Z])/g, '-$1')
    .toLowerCase();
const norm = (s) =>
  s
    .replace(/\/\/.*$/gm, '')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/[;,]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

let drift = 0,
  checked = 0,
  upstreamless = 0;
for (const f of readdirSync(LOCAL)) {
  if (LOCAL_ADAPTATIONS.has(f)) continue;
  const localPath = join(LOCAL, f);
  if (!existsSync(localPath)) continue;
  const baseNoExt = f.replace(/\.tsx?$/, '');
  // upstream layout: content/<Category>/<Name>/<Name>.tsx
  let upstreamPath;
  for (const cat of readdirSync(UPSTREAM)) {
    const p = join(UPSTREAM, cat, baseNoExt, baseNoExt + '.tsx');
    if (existsSync(p)) {
      upstreamPath = p;
      break;
    }
  }
  if (!upstreamPath) {
    upstreamless++;
    continue;
  }
  checked++;
  const a = norm(readFileSync(localPath, 'utf8'));
  const b = norm(readFileSync(upstreamPath, 'utf8'));
  if (a !== b) {
    drift++;
    console.log(`DRIFT: ${f} vs ${upstreamPath}`);
  }
}
console.log(`checked=${checked} drifted=${drift} no-upstream-found=${upstreamless}`);
// Reporting mode: exit 0 so CI surfaces drift without blocking builds.
// Re-sync or tighten to exit 1 once the vendored set is reconciled.
process.exit(0);
