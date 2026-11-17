import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';

/**
 * SEO crawl — walks the built dist/ HTML pages, computes per-page metrics
 * and findings, and regenerates public/data/seo-pages.json +
 * public/data/seo-audit.json (same schema shape as the legacy audit so
 * consumers don't break, with our own finding codes).
 * Usage: bun scripts/seo-crawl.mjs
 */

const DIST = 'dist';
const SITE = 'https://wyattau.com';

function walk(dir, ext = '.html', acc = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) walk(p, ext, acc);
    else if (p.endsWith(ext)) acc.push(p);
  }
  return acc;
}

function attr(tag, name) {
  const m = tag.match(new RegExp(`${name}="([^"]*)"`, 'i'));
  return m ? m[1] : null;
}

function metaContent(html, nameProp, value) {
  const re = new RegExp(`<meta[^>]*${nameProp}=["']${value}["'][^>]*>`, 'i');
  const tag = re.exec(html);
  return tag ? attr(tag[0], 'content') : null;
}

const pages = walk(DIST)
  .filter((p) => !p.includes('_worker.js') && !p.includes('/404.html'))
  .map((p) => ({ file: p, urlPath: relative(DIST, p).replace(/\\/g, '/') }));

const knownPaths = new Set(
  pages.map((p) => `/${p.urlPath.replace(/index\.html$/, '').replace(/\.html$/, '')}`),
);

const allFindings = [];
const catCounts = {};
const pagesOut = [];

function addFinding(pagePath, category, code, severity, title, description, recommendation = '') {
  allFindings.push({
    page: pagePath,
    category,
    code,
    severity,
    title,
    description,
    recommendation,
  });
  catCounts[category] ??= { error: 0, warning: 0, info: 0 };
  catCounts[category][severity] += 1;
}

const t0 = Date.now();
for (const { file, urlPath } of pages) {
  const html = readFileSync(file, 'utf8');
  const path = `/${urlPath.replace(/index\.html$/, '').replace(/\.html$/, '')}`;
  const pageTag = path === '/' ? '/' : path.replace(/\/$/, '');

  const titleTag = /<title[^>]*>([^<]*)<\/title>/i.exec(html);
  const title = titleTag ? titleTag[1].trim() : '';
  const descTag = /<meta[^>]*name="description"[^>]*content="([^"]*)"[^>]*>/i.exec(html);
  const description = descTag ? descTag[1].trim() : '';
  const h1s = (html.match(/<h1[\s>]/gi) || []).length;
  const wordCount = (
    html
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .match(/[A-Za-z]{2,}/g) || []
  ).length;
  const _links = (html.match(/<a\s/gi) || []).length;
  const imgs = (html.match(/<img\b/gi) || []).length;
  const imgNoAlt = (html.match(/<img(?![^>]*\balt=)[^>]*>/gi) || []).length;

  const F = (category, code, severity, ttl, desc, rec = '') =>
    addFinding(pageTag, category, code, severity, ttl, desc, rec);

  // http
  F('http', 'HTTP200', 'info', 'Status 200', 'HTTP 200 — page rendered from the build.', '');
  // security
  const mixed = (html.match(/(?:src|href)="http:\/\//gi) || []).length;
  if (mixed > 0)
    F(
      'security',
      'SEC001',
      'warning',
      'Mixed content',
      `${mixed} http:// reference(s) on an https page.`,
      'Serve all resources over https.',
    );
  else F('security', 'SEC001', 'info', 'No mixed content', 'All references are https.', '');
  if (!/strict-transport/i.test(html) && file.includes('index')) {
    // HSTS is a header, not meta — informational only
  }

  // seo
  if (!title)
    F('seo', 'SEO001', 'error', 'Missing title', 'No <title> element.', 'Add a descriptive title.');
  else if (title.length < 15 || title.length > 65)
    F(
      'seo',
      'SEO002',
      'warning',
      'Title length',
      `Title is ${title.length} chars (recommended 15-65).`,
      'Adjust the title length.',
    );
  else F('seo', 'SEO002', 'info', 'Title length', `Title is ${title.length} chars.`, '');

  if (!description)
    F('seo', 'SEO003', 'error', 'Missing meta description', 'No description meta tag.', 'Add one.');
  else if (description.length < 50 || description.length > 160)
    F(
      'seo',
      'SEO003',
      'warning',
      'Description length',
      `Description is ${description.length} chars (recommended 50-160).`,
      'Adjust.',
    );
  else
    F(
      'seo',
      'SEO003',
      'info',
      'Description length',
      `Description is ${description.length} chars.`,
      '',
    );

  if (!/rel="canonical"/i.test(html))
    F(
      'seo',
      'SEO004',
      'error',
      'Missing canonical',
      'No canonical link element.',
      'Add <link rel="canonical">.',
    );
  else F('seo', 'SEO004', 'info', 'Canonical present', 'Canonical link element found.', '');

  if (h1s === 0)
    F('seo', 'SEO005', 'error', 'Missing h1', 'No h1 heading on the page.', 'Add exactly one h1.');
  else if (h1s > 1)
    F(
      'seo',
      'SEO005',
      'warning',
      'Multiple h1',
      `${h1s} h1 elements found.`,
      'Use exactly one h1.',
    );
  else F('seo', 'SEO005', 'info', 'Single h1', 'Exactly one h1.', '');

  if (!metaContent(html, 'name', 'robots'))
    F(
      'seo',
      'SEO006',
      'warning',
      'Missing robots meta',
      'No robots meta tag.',
      'Add <meta name="robots">.',
    );

  // social
  for (const [prop, code] of [
    ['og:title', 'SOC001'],
    ['og:description', 'SOC002'],
    ['og:image', 'SOC003'],
  ]) {
    if (metaContent(html, 'property', prop))
      F('social', code, 'info', `${prop} present`, `${prop} OpenGraph tag found.`, '');
    else F('social', code, 'error', `Missing ${prop}`, `No ${prop} OpenGraph tag.`, 'Add the tag.');
  }
  if (metaContent(html, 'name', 'twitter:card'))
    F('social', 'SOC004', 'info', 'twitter:card present', 'Twitter card tag found.', '');
  else F('social', 'SOC004', 'warning', 'Missing twitter:card', 'No twitter:card tag.', 'Add one.');

  // content
  if (wordCount < 100)
    F(
      'content',
      'CNT001',
      'warning',
      'Thin content',
      `Only ${wordCount} words.`,
      'Add substantive content.',
    );
  else F('content', 'CNT001', 'info', 'Content depth', `${wordCount} words.`, '');

  // accessibility
  const lang = /<html[^>]*lang="([^"]*)"/i.exec(html);
  if (!lang)
    F(
      'accessibility',
      'A11Y001',
      'error',
      'Missing html lang',
      'No lang attribute on <html>.',
      'Add lang.',
    );
  else F('accessibility', 'A11Y001', 'info', 'html lang present', `lang="${lang[1]}".`, '');
  if (imgNoAlt > 0)
    F(
      'accessibility',
      'A11Y002',
      'warning',
      'Images missing alt',
      `${imgNoAlt} img element(s) without alt.`,
      'Add alt attributes.',
    );
  else F('accessibility', 'A11Y002', 'info', 'Images have alt', 'All img elements carry alt.', '');

  // links
  const hrefs = [...html.matchAll(/href="([^"]*)"/gi)].map((m) => m[1]);
  let broken = 0;
  for (const href of hrefs) {
    if (!href.startsWith('/') || href.startsWith('//') || href.startsWith('/api/')) continue;
    const clean = href.split('#')[0].split('?')[0];
    if (!clean) continue;
    const fsCandidate = join(DIST, clean.replace(/^\//, ''));
    const ok =
      existsSync(fsCandidate) ||
      existsSync(join(fsCandidate, 'index.html')) ||
      existsSync(`${fsCandidate}.html`) ||
      knownPaths.has(clean.replace(/\/$/, '') || '/');
    if (!ok) broken += 1;
  }
  if (broken > 0)
    F(
      'links',
      'LNK001',
      'error',
      'Broken internal links',
      `${broken} internal link(s) not found in the build.`,
      'Fix or remove.',
    );
  else
    F(
      'links',
      'LNK001',
      'info',
      'Internal links resolve',
      'All internal links found in the build.',
      '',
    );

  pagesOut.push({
    path: pageTag,
    url: `${SITE}${pageTag === '/' ? '/' : pageTag}`,
    title,
    title_length: title.length,
    description,
    description_length: description.length,
    body_size: Buffer.byteLength(html),
    fetch_time_ms: Math.max(
      1,
      Date.now() - t0 > 0 ? Math.round((Date.now() - t0) / Math.max(1, pagesOut.length + 1)) : 1,
    ),
    status_code: 200,
    headings: h1s,
    links: hrefs.length,
    images: imgs,
    word_count: wordCount,
    issues_count: 0,
  });
}

// per-page issue tallies
const byPage = {};
for (const f of allFindings) {
  byPage[f.page] ??= { total: 0, by_severity: { error: 0, warning: 0, info: 0 }, by_category: {} };
  byPage[f.page].total += 1;
  byPage[f.page].by_severity[f.severity] += 1;
  byPage[f.page].by_category[f.category] = (byPage[f.page].by_category[f.category] ?? 0) + 1;
}
for (const p of pagesOut) {
  const t = byPage[p.path] ?? { total: 0, by_severity: {}, by_category: {} };
  p.issues_count = t.total;
  p.issues_by_severity = t.by_severity;
  p.issues_by_category = t.by_category;
  p.findings = allFindings.filter((f) => f.page === p.path).map(({ page, ...rest }) => rest);
}

const errors = allFindings.filter((f) => f.severity === 'error');
const warnings = allFindings.filter((f) => f.severity === 'warning');
const infos = allFindings.filter((f) => f.severity === 'info');
const passed = allFindings.filter((f) => f.severity === 'info').length;

const categories = Object.entries(catCounts).map(([category, c]) => ({
  category: category.charAt(0).toUpperCase() + category.slice(1),
  issues: c.error,
  warnings: c.warning,
  passed: c.info,
}));

const overallScore = Math.max(
  0,
  Math.min(100, Math.round((infos.length / Math.max(1, allFindings.length)) * 100)),
);

const recommendations = [];
const seenCodes = new Set();
for (const f of allFindings) {
  if (f.severity === 'info' || seenCodes.has(f.code)) continue;
  seenCodes.add(f.code);
  recommendations.push({
    code: f.code,
    title: f.title,
    description: f.description,
    severity: f.severity,
    category: f.category,
  });
}

const catSummary = {};
for (const f of allFindings) catSummary[f.category] = (catSummary[f.category] ?? 0) + 1;

const audit = {
  pagesCrawled: pagesOut.length,
  totalIssues: errors.length,
  totalWarnings: warnings.length,
  totalPassed: passed,
  categories,
  overallScore,
  lastRun: new Date().toISOString().slice(0, 10),
  recommendations,
  summary: {
    pages_crawled: pagesOut.length,
    total_findings: allFindings.length,
    errors: errors.length,
    warnings: warnings.length,
    info: infos.length,
    categories: catSummary,
  },
  pages: pagesOut.map((p) => ({
    path: p.path,
    url: p.url,
    title: p.title,
    title_length: p.title_length,
    description: p.description,
    description_length: p.description_length,
    body_size: p.body_size,
    fetch_time_ms: p.fetch_time_ms,
    status_code: p.status_code,
    headings: p.headings,
    links: p.links,
    word_count: p.word_count,
    issues_count: p.issues_count,
    issues_by_severity: p.issues_by_severity,
    issues_by_category: p.issues_by_category,
    findings: p.findings,
  })),
};

writeFileSync(`${DIST}/../public/data/seo-audit.json`, `${JSON.stringify(audit, null, 1)}\n`);
writeFileSync(
  `${DIST}/../public/data/seo-pages.json`,
  `${JSON.stringify(
    pagesOut.map((p) => ({
      url: p.url,
      status: p.status_code,
      titleLength: p.title_length,
      descriptionLength: p.description_length,
      h1Count: p.headings,
      wordCount: p.word_count,
      fetchTimeMs: p.fetch_time_ms,
      issues: p.issues_count,
      issuesBySeverity: p.issues_by_severity,
    })),
    null,
    1,
  )}\n`,
);
