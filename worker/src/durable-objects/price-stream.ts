export class PriceStream {
  private state: DurableObjectState;
  private sessions: WebSocket[];
  private upstreamConnections: Map<string, WebSocket>;

  constructor(state: DurableObjectState) {
    this.state = state;
    this.sessions = [];
    this.upstreamConnections = new Map();
  }

  async fetch(request: Request): Promise<Response> {
    const upgradeHeader = request.headers.get('Upgrade');
    if (upgradeHeader !== 'websocket') {
      return new Response('Expected WebSocket upgrade', { status: 426 });
    }

    const pair = new WebSocketPair();
    const [client, server] = [pair[0], pair[1]];

    this.state.acceptWebSocket(server);
    this.sessions.push(server);

    return new Response(null, { status: 101, webSocket: client });
  }

  async webSocketMessage(_ws: WebSocket, message: string | ArrayBuffer): Promise<void> {
    try {
      const data =
        typeof message === 'string'
          ? JSON.parse(message)
          : JSON.parse(new TextDecoder().decode(message));
      if (data.action === 'subscribe' && data.symbol) {
        await this.connectUpstream(data.symbol);
      }
    } catch {
      // Ignore parse errors
    }
  }

  async webSocketClose(ws: WebSocket): Promise<void> {
    this.sessions = this.sessions.filter((s) => s !== ws);
  }

  private async connectUpstream(symbol: string): Promise<void> {
    if (this.upstreamConnections.has(symbol)) return;

    const wsUrl = `wss://stream.binance.com:9443/ws/${symbol.toLowerCase()}@ticker`;
    const ws = new WebSocket(wsUrl);

    ws.addEventListener('message', (event) => {
      this.broadcast({ symbol, data: JSON.parse(event.data as string) });
    });

    ws.addEventListener('close', () => {
      this.upstreamConnections.delete(symbol);
    });

    ws.addEventListener('error', () => {
      this.upstreamConnections.delete(symbol);
    });

    this.upstreamConnections.set(symbol, ws);
  }

  private broadcast(data: unknown): void {
    const message = JSON.stringify(data);
    for (const ws of this.sessions) {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(message);
      }
    }
  }
}
