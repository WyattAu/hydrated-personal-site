import { log } from '../logger';
import { checkRateLimit } from '../rate-limiter';
import { MAX_BODY_SIZE, error, json, sanitize } from '../security';
import type { Env } from '../types';

export async function handleGuestbookGet(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const page = Math.max(1, Number.parseInt(url.searchParams.get('page') || '1', 10) || 1);
  const limit = Math.min(
    50,
    Math.max(1, Number.parseInt(url.searchParams.get('limit') || '20', 10) || 20),
  );

  const fallbackEntries = [
    {
      id: '1',
      name: 'Visitor',
      message: 'Great site!',
      created_at: new Date(Date.now() - 86400000).toISOString(),
    },
    {
      id: '2',
      name: 'Dev',
      message: 'Love the WASM widgets.',
      created_at: new Date(Date.now() - 3600000).toISOString(),
    },
  ];

  let allEntries: Array<{ id: string; name: string; message: string; created_at: string }> =
    fallbackEntries;

  // Try to read from KV if available
  if (env.GUESTBOOK) {
    try {
      const listResult = await env.GUESTBOOK.list({ prefix: 'entry:' });
      if (listResult.keys.length > 0) {
        const kvEntries: Array<{ id: string; name: string; message: string; created_at: string }> =
          [];
        for (const key of listResult.keys) {
          const value = await env.GUESTBOOK.get(key.name);
          if (value) {
            try {
              const parsed = JSON.parse(value);
              // Normalize field name: worker stores as 'created', frontend expects 'created_at'
              if (parsed.created && !parsed.created_at) {
                parsed.created_at = new Date(parsed.created).toISOString();
              }
              kvEntries.push(parsed);
            } catch (e) {
              log('warn', 'guestbook KV entry parse failed', { key: key.name, error: String(e) });
            }
          }
        }
        if (kvEntries.length > 0) {
          // Sort by created_at descending (newest first)
          kvEntries.sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''));
          allEntries = kvEntries;
        }
      }
    } catch (e) {
      log('warn', 'KV read failed, using fallback', { error: String(e) });
    }
  }

  const start = (page - 1) * limit;
  const entries = allEntries.slice(start, start + limit);

  return json({
    entries,
    pagination: {
      page,
      limit,
      total: allEntries.length,
      totalPages: Math.ceil(allEntries.length / limit),
    },
  });
}

export async function handleGuestbookPost(
  request: Request,
  env: Env,
  ip: string,
): Promise<Response> {
  if (!checkRateLimit(ip, 5, 10 * 60 * 1000)) {
    return error('Rate limit exceeded. Try again later.', 429);
  }

  // Body size check
  const contentLength = Number.parseInt(request.headers.get('content-length') || '0', 10);
  if (contentLength > MAX_BODY_SIZE) {
    return error('Request body too large', 413);
  }

  let body: { name?: string; message?: string; website?: string };
  try {
    body = await request.json();
  } catch (e) {
    log('warn', 'guestbook post body parse failed', { error: String(e) });
    return error('Invalid JSON body');
  }

  if (body.website) return json({ success: true }); // Honeypot

  if (!body.name || !body.message) return error('name and message are required');
  if (body.name.length > 50 || body.message.length > 500) return error('Input too long');

  const entry = {
    id: crypto.randomUUID(),
    name: sanitize(body.name),
    message: sanitize(body.message),
    created: Date.now(),
  };

  if (env.GUESTBOOK) {
    await env.GUESTBOOK.put(`entry:${entry.id}`, JSON.stringify(entry));
  }

  log('info', 'guestbook entry created', { id: entry.id, ip });
  return json({ success: true, entry }, 201);
}

export async function handleGuestbookDelete(request: Request, env: Env): Promise<Response> {
  const auth = request.headers.get('Authorization');
  if (!auth?.startsWith('Bearer ') || auth.slice(7) !== env.ADMIN_TOKEN) {
    return error('Unauthorized', 401);
  }

  // Body size check
  const contentLength = Number.parseInt(request.headers.get('content-length') || '0', 10);
  if (contentLength > MAX_BODY_SIZE) {
    return error('Request body too large', 413);
  }

  let body: { id?: string };
  try {
    body = await request.json();
  } catch (e) {
    log('warn', 'guestbook delete body parse failed', { error: String(e) });
    return error('Invalid JSON body');
  }

  if (!body.id) return error('id is required');

  if (env.GUESTBOOK) {
    await env.GUESTBOOK.delete(`entry:${body.id}`);
  }

  log('info', 'guestbook entry deleted', { id: body.id });
  return json({ success: true });
}
