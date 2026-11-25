import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

/**
 * MFT lineage discipline, converted from documentation into enforcement:
 * the published study must derive from the exact dataset bytes whose hash
 * the snapshot manifest records. If the dataset changes without a new
 * snapshot, or the study drifts from the dataset, this goes red.
 */

const SITE = 'apps/site';
const DATASET = `${SITE}/public/data/etf-database.json`;
const STUDY = `${SITE}/src/pages/insights/etf-allocation-study.astro`;
const MANIFEST = `${SITE}/public/data/snapshots/manifest.json`;

const datasetSha16 = createHash('sha256')
  .update(readFileSync(DATASET))
  .digest('hex')
  .slice(0, 16);

describe('dataset lineage', () => {
  it('dataset file exists and hashes stably', () => {
    expect(datasetSha16).toMatch(/^[0-9a-f]{16}$/);
  });

  it('study page embeds the current dataset hash', () => {
    const s = readFileSync(STUDY, 'utf8');
    const m = s.match(/DATASET_SHA256_16 = createHash[\s\S]*?slice\(0, 16\)/);
    expect(m, 'study must compute a dataset hash').toBeTruthy();
    const rendered = s.match(/sha256:{DATASET_SHA256_16}/);
    expect(rendered, 'study must render the hash for citation').toBeTruthy();
  });

  it('manifest records a snapshot with the current dataset hash', () => {
    expect(existsSync(MANIFEST), 'snapshot manifest must exist').toBe(true);
    const manifest = JSON.parse(readFileSync(MANIFEST, 'utf8'));
    const hashes = manifest.snapshots.map((s: { sha256_16: string }) => s.sha256_16);
    expect(
      hashes,
      `dataset sha256:${datasetSha16} is not snapshotted — run scripts/snapshot-dataset.mjs`,
    ).toContain(datasetSha16);
  });
});
