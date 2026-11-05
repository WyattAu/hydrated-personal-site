export const securityHeaders: Record<string, string> = {
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Cross-Origin-Embedder-Policy': 'credentialless',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  'Content-Security-Policy':
    "default-src 'self'; script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval' https://plausible.io https://static.cloudflareinsights.com; style-src 'self' 'unsafe-inline' https://unpkg.com https://fonts.googleapis.com; img-src 'self' data: https:; font-src 'self' https://fonts.gstatic.com; connect-src 'self' https://wyattau.com https://services.swpc.noaa.gov https://plausible.io https://api.okx.com https://www.okx.com https://api.kraken.com https://api.bybit.com https://api.mempool.space https://api.alternative.me https://query2.finance.yahoo.com https://hydrated-worker.wyatt-au.workers.dev https://challenges.cloudflare.com; report-uri /api/csp-report;",
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export const MAX_BODY_SIZE = 10 * 1024;

export function sanitize(input: string): string {
  return input
    .replace(/[<>]/g, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '')
    .replace(/\0/g, '')
    .trim();
}

export function json(
  data: unknown,
  status = 200,
  extraHeaders: Record<string, string> = {},
): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...securityHeaders,
      ...extraHeaders,
    },
  });
}

export function error(message: string, status = 400): Response {
  return json({ error: message }, status);
}
