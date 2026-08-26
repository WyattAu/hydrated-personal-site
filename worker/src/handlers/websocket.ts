import type { Env } from '../types';

export async function handleWebSocketUpgrade(request: Request, env: Env): Promise<Response> {
  const upgradeHeader = request.headers.get('Upgrade');
  if (upgradeHeader !== 'websocket') {
    return new Response('Expected WebSocket upgrade', { status: 426 });
  }

  if (!env.PRICE_STREAM) {
    return new Response('PRICE_STREAM Durable Object not configured', { status: 500 });
  }

  const id = env.PRICE_STREAM.idFromName('default');
  const stub = env.PRICE_STREAM.get(id);

  const url = new URL(request.url);
  const clientUrl = new URL(url.pathname, url.origin);
  clientUrl.searchParams.set('symbol', url.searchParams.get('symbol') || 'btcusdt');

  return stub.fetch(
    new Request(clientUrl.toString(), {
      headers: request.headers,
    }),
  );
}
