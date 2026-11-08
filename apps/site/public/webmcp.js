/* WebMCP — expose site tools to AI agents via the browser WebMCP API.
 * https://webmachinelearning.github.io/webmcp/
 * Progressive enhancement: no-op when navigator.modelContext is absent.
 * Each registration keeps an AbortController; all are aborted on pagehide. */
(() => {
  if (typeof navigator === 'undefined' || !('modelContext' in navigator)) return;

  const controllers = [];

  const getJSON = (path) =>
    fetch(path, { headers: { Accept: 'application/json' } }).then((r) => {
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return r.json();
    });

  const tools = [
    {
      name: 'get-crypto-prices',
      description:
        'Fetch live 24-hour crypto prices for major pairs (BTC, ETH, SOL, BNB, XRP, ADA) from the Binance ticker on this site. Returns symbol, price, change percent, high, low.',
      inputSchema: { type: 'object', properties: {}, required: [] },
      execute: () => getJSON('/api/crypto-ticker').then((d) => JSON.stringify(d)),
    },
    {
      name: 'get-earthquakes',
      description:
        'Fetch the last 24 hours of worldwide earthquakes from USGS as a feature list with magnitude, place, and time. Served by this site.',
      inputSchema: { type: 'object', properties: {}, required: [] },
      execute: () =>
        getJSON('/api/earthquakes').then((d) =>
          JSON.stringify(
            (d.features || []).slice(0, 10).map((f) => ({
              mag: f.properties?.mag,
              place: f.properties?.place,
              time: f.properties?.time,
            })),
          ),
        ),
    },
    {
      name: 'get-upcoming-launches',
      description:
        'Fetch upcoming orbital launches (name, provider, rocket, launch site, T-minus) from Launch Library 2 via this site. Polls at most once per 30 minutes upstream.',
      inputSchema: { type: 'object', properties: {}, required: [] },
      execute: () => getJSON('/api/space-launches').then((d) => JSON.stringify(d)),
    },
    {
      name: 'get-macro-rates',
      description:
        'Fetch macro risk rates (VIX, DXY, 10Y yield, gold, silver, copper, WTI, Brent) from Yahoo Finance via this site.',
      inputSchema: { type: 'object', properties: {}, required: [] },
      execute: () =>
        getJSON('/api/stock-quote?symbols=^VIX,DX-Y.NYB,^TNX,GC=F,SI=F,HG=F,CL=F,BZ=F').then((d) =>
          JSON.stringify(d),
        ),
    },
  ];

  for (const tool of tools) {
    const controller = new AbortController();
    try {
      navigator.modelContext.registerTool({
        name: tool.name,
        description: tool.description,
        inputSchema: tool.inputSchema,
        execute: tool.execute,
        signal: controller.signal,
      });
      controllers.push(controller);
    } catch {
      /* modelContext API shape drift: no-op */
    }
  }

  window.addEventListener('pagehide', () => {
    for (const c of controllers) {
      try {
        c.abort();
      } catch {
        /* noop */
      }
    }
  });
})();
