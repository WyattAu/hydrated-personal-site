import { defineMiddleware } from 'astro:middleware';
import etfMd from './markdown/etf.md?raw';
import indexMd from './markdown/index.md?raw';
import worldMd from './markdown/world.md?raw';

/** Markdown variants for agent content negotiation (Accept: text/markdown). */
const MD_VARIANTS: Record<string, string> = {
  '/': indexMd,
  '/index.html': indexMd,
  '/world': worldMd,
  '/world/': worldMd,
  '/world/index.html': worldMd,
  '/etf': etfMd,
  '/etf/': etfMd,
  '/etf/index.html': etfMd,
};

const CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval' https://plausible.io https://static.cloudflareinsights.com",
  "style-src 'self' 'unsafe-inline' https://unpkg.com https://fonts.googleapis.com",
  "img-src 'self' data: https:",
  "font-src 'self' https://fonts.gstatic.com",
  "connect-src 'self' https://wyattau.com https://services.swpc.noaa.gov https://plausible.io https://api.okx.com https://www.okx.com https://api.kraken.com https://api.bybit.com https://api.mempool.space https://api.alternative.me https://query2.finance.yahoo.com https://hydrated-worker.wyatt-au.workers.dev https://challenges.cloudflare.com",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join('; ');

export const onRequest = defineMiddleware(async (context, next) => {
  // Content negotiation: agents may request the markdown variant of a page
  // (Accept: text/markdown). Only for prerendered HTML routes with a .md twin.
  const accept = context.request.headers.get('Accept') || '';
  const pathname = context.url.pathname.replace(/\/index\.html$/, '') || '/';
  const md = MD_VARIANTS[pathname.replace(/\/$/, '') || '/'];
  if (
    md &&
    accept.includes('text/markdown') &&
    !accept.includes('text/html') &&
    context.request.method === 'GET'
  ) {
    return new Response(md, {
      headers: {
        'Content-Type': 'text/markdown; charset=utf-8',
        Vary: 'Accept',
      },
    });
  }
  const response = await next();
  response.headers.set('Content-Security-Policy', CSP);
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set(
    'Link',
    '</.well-known/api-catalog>; rel="api-catalog", </llms.txt>; rel="describedby", </auth.md>; rel="service-doc", </.well-known/agent-card.json>; rel="service-desc"',
  );
  return response;
});
