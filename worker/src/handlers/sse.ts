import { fetchJson } from '../fetch';
import { log } from '../logger';

export async function handleCryptoTickerSSE(request: Request): Promise<Response> {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = async () => {
        try {
          const data = (await fetchJson(
            'https://api.binance.com/api/v3/ticker/24hr',
            'crypto-ticker-sse',
          )) as Array<Record<string, unknown>>;

          const limited = data.slice(0, 20);
          const payload = `data: ${JSON.stringify(limited)}\n\n`;
          controller.enqueue(encoder.encode(payload));
        } catch (e) {
          log('warn', 'SSE crypto ticker fetch failed, sending keepalive', { error: String(e) });
          controller.enqueue(encoder.encode(': keepalive\n\n'));
        }
      };

      await send();

      const interval = setInterval(async () => {
        await send();
      }, 5000);

      request.signal.addEventListener('abort', () => {
        clearInterval(interval);
        controller.close();
      });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
      'Access-Control-Allow-Origin': '*',
    },
  });
}

export async function handleMetricsSSE(request: Request): Promise<Response> {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = async () => {
        const metrics = {
          timestamp: Date.now(),
          uptime: performance.now(),
          memoryUsage: 'N/A',
        };
        const payload = `event: metrics\ndata: ${JSON.stringify(metrics)}\n\n`;
        controller.enqueue(encoder.encode(payload));
      };

      await send();

      const interval = setInterval(async () => {
        await send();
      }, 10000);

      request.signal.addEventListener('abort', () => {
        clearInterval(interval);
        controller.close();
      });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
      'Access-Control-Allow-Origin': '*',
    },
  });
}
