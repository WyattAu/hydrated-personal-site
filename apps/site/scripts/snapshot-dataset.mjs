#!/usr/bin/env node
/**
 * Quarterly dataset snapshotter — longitudinal data infrastructure.
 *
 * Snapshots public/data/etf-database.json into public/data/snapshots/
 * as etf-database-<YEAR>-Q<N>.json and updates manifest.json (quarter,
 * fund count, sha256, byte size). Snapshots are PUBLIC keyless downloads
 * — they turn the ETF studies from static snapshots into a longitudinal
 * dataset (trend research = the citability moat).
 *
 * Idempotent per quarter: existing snapshots are skipped unless --force.
 * Cadence: first build/deploy of each quarter (or `bun scripts/snapshot-dataset.mjs`).
 */
import { createHash } from 'node:crypto';
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname; // apps/site
const DATA = join(ROOT, 'public', 'data');
const SOURCE = join(DATA, 'etf-database.json');
const SNAPDIR = join(DATA, 'snapshots');
const MANIFEST = join(SNAPDIR, 'manifest.json');

const force = process.argv.includes('--force');
const now = new Date();
const quarter = `etf-database-${now.getUTCFullYear()}-Q${Math.floor(now.getUTCMonth() / 3) + 1}`;
const target = join(SNAPDIR, `${quarter}.json`);

if (!existsSync(SOURCE)) {
  console.error(`source dataset missing: ${SOURCE}`);
  process.exit(1);
}
mkdirSync(SNAPDIR, { recursive: true });

if (existsSync(target) && !force) {
  console.log(`snapshot exists: ${quarter} (skip; --force to overwrite)`);
  process.exit(0);
}

copyFileSync(SOURCE, target);
const bytes = readFileSync(target);
const sha256 = createHash('sha256').update(bytes).digest('hex').slice(0, 16);
const funds = JSON.parse(bytes).length;

const manifestPath = join(SNAPDIR, 'manifest.json');
const manifest = existsSync(manifestPath)
  ? JSON.parse(readFileSync(manifestPath, 'utf8'))
  : { dataset: 'etf-database', snapshots: [] };
manifest.snapshots = manifest.snapshots.filter((s) => s.quarter !== quarter);
manifest.snapshots.push({
  quarter,
  file: `snapshots/${quarter}.json`,
  funds,
  bytes: bytes.length,
  sha256_16: sha256,
  taken: now.toISOString().slice(0, 10),
});
manifest.snapshots.sort((a, b) => a.quarter.localeCompare(b.quarter));
writeFileSync(manifestPath, JSON.stringify(manifest, null, '\t') + '\n');

console.log(`snapshotted ${quarter}: ${funds} funds, ${bytes.length} bytes, sha256:${sha256}`);
