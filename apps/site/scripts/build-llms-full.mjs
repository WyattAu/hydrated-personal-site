import { readFileSync, readdirSync, writeFileSync } from 'node:fs';

/**
 * Prebuild: regenerate public/.well-known/llms-full.txt as the full-text
 * variant — llms.txt + every markdown page variant concatenated. Keeps the
 * "full" file honest: always in sync with the per-page .md sources.
 */
const SITE = 'https://wyattau.com';
const header = readFileSync('public/llms.txt', 'utf8').trim();
const mdDir = 'src/markdown';
const files = readdirSync(mdDir)
  .filter((f) => f.endsWith('.md'))
  .sort();

const titles = {
  index: 'Home',
  world: 'World Monitor',
  etf: 'ETF Intelligence',
  ml: 'ML Intelligence',
  dossier: 'Dossier',
  projects: 'Projects',
};

let out = `${header}\n\n# Full page contents (markdown)\n`;
for (const f of files) {
  const slug = f.replace(/\.md$/, '');
  const body = readFileSync(`${mdDir}/${f}`, 'utf8').trim();
  out += `\n\n---\n\n# Page: ${titles[slug] ?? slug} (${SITE}/${slug === 'index' ? '' : slug})\n\n${body}\n`;
}
out += `\n\n---\n\n# Machine endpoints\n\nAll public GET, keyless, edge-cached. Full list in ${SITE}/auth.md. Agent discovery: ${SITE}/.well-known/api-catalog, ${SITE}/.well-known/agent-card.json, ${SITE}/.well-known/agent-skills/index.json.\n`;

writeFileSync('public/.well-known/llms-full.txt', out);
console.log(`llms-full.txt: ${out.length} bytes, ${files.length} md pages`);
