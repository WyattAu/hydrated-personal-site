#!/usr/bin/env node
/**
 * SBOM generator (CycloneDX 1.5 JSON) from bun.lock + Cargo.lock.
 * One file, both ecosystems, committed per build as certification evidence.
 */
import { readFileSync, writeFileSync } from 'node:fs';

const components = [];
let serialBase = 'hydrated-personal-site';

// Bun (text lockfile: lines with quoted package@version)
try {
  const lock = readFileSync('apps/site/bun.lock', 'utf8');
  const re = /"([@a-z0-9/.-]+)@([0-9][^"]*)"/g;
  const seen = new Set();
  let m;
  while ((m = re.exec(lock))) {
    const key = `${m[1]}@${m[2]}`;
    if (seen.has(key)) continue;
    seen.add(key);
    components.push({
      type: 'library',
      name: m[1],
      version: m[2],
      purl: `pkg:npm/${m[1]}@${m[2]}`,
    });
  }
} catch { /* bun.lock absent */ }

// Cargo (Cargo.lock [[package]] blocks)
try {
  const lock = readFileSync('packages/widgets/Cargo.lock', 'utf8');
  const re = /\[\[package\]\]\nname = "([^"]+)"\nversion = "([^"]+)"/g;
  let m;
  while ((m = re.exec(lock))) {
    components.push({
      type: 'library',
      name: m[1],
      version: m[2],
      purl: `pkg:cargo/${m[1]}@${m[2]}`,
    });
  }
} catch { /* Cargo.lock absent */ }

const sbom = {
  bomFormat: 'CycloneDX',
  specVersion: '1.5',
  serialNumber: `urn:uuid:${serialBase}-${new Date().toISOString().slice(0, 10)}`,
  components: components.sort((a, b) => a.purl.localeCompare(b.purl)),
};
writeFileSync('docs/sbom.json', JSON.stringify(sbom, null, 2));
console.log(`SBOM: ${components.length} components -> docs/sbom.json`);
