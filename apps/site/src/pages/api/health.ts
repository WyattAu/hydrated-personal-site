export const GET = () =>
  new Response(JSON.stringify({ status: 'ok', timestamp: Date.now() }), {
    headers: { 'Content-Type': 'application/json' },
  });
