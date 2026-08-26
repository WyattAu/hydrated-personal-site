import { getCacheSize } from '../cache';
import { getCircuitStates } from '../circuit-breaker';
import { log } from '../logger';
import { getMetricsSummary } from '../metrics';
import { json } from '../security';

export function handleMetrics(): Response {
  const summary = getMetricsSummary();
  const circuitBreakers = Object.fromEntries(
    Array.from(getCircuitStates().entries()).map(([k, v]) => [
      k,
      { open: v.open, failures: v.failures },
    ]),
  );

  return json({
    ...summary,
    cacheSize: getCacheSize(),
    circuitBreakers,
  });
}

export async function handleCspReport(request: Request): Promise<Response> {
  try {
    const body = await request.json();
    log('warn', 'CSP violation', { report: body });
  } catch {
    // Ignore parse errors
  }
  return new Response(null, { status: 204 });
}

// --- API Versioning ---
const SUPPORTED_VERSIONS = ['v1'];
const LATEST_VERSION = 'v1';

export function resolveVersionedRoute(path: string): {
  version: string | null;
  route: string;
  isVersioned: boolean;
} {
  const versionMatch = path.match(/^\/api\/(v\d+)(\/.*)?$/);
  if (versionMatch) {
    return {
      version: versionMatch[1],
      route: versionMatch[2] || '/',
      isVersioned: true,
    };
  }
  return { version: null, route: path, isVersioned: false };
}

export function addVersionHeaders(response: Response, version: string): Response {
  const newResponse = new Response(response.body, response);
  newResponse.headers.set('X-API-Version', version);
  newResponse.headers.set('X-API-Latest-Version', LATEST_VERSION);
  newResponse.headers.set('X-API-Supported-Versions', SUPPORTED_VERSIONS.join(', '));
  return newResponse;
}

export function addDeprecationHeaders(response: Response): Response {
  const newResponse = new Response(response.body, response);
  newResponse.headers.set('Deprecation', 'true');
  newResponse.headers.set('Sunset', 'Sat, 01 Jan 2028 00:00:00 GMT');
  newResponse.headers.set('Link', '</api/v1>; rel="successor-version"');
  newResponse.headers.set(
    'X-Deprecation-Notice',
    'Use /api/v1/ instead. Unversioned /api/ will be removed in a future release.',
  );
  return newResponse;
}

export function handleVersions(): Response {
  return json({
    versions: SUPPORTED_VERSIONS,
    latest: LATEST_VERSION,
    deprecation: {
      unversioned: true,
      sunset: '2028-01-01',
      message: 'Unversioned /api/ endpoints are deprecated. Use /api/v1/ instead.',
    },
  });
}
