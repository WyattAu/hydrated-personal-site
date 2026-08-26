interface PooledConnection {
  ws: WebSocket;
  refCount: number;
  lastUsed: number;
}

const IDLE_TIMEOUT_MS = 30_000;

export class ConnectionPool {
  private pools: Map<string, PooledConnection> = new Map();

  async acquire(url: string): Promise<WebSocket> {
    const existing = this.pools.get(url);
    if (existing && existing.ws.readyState === WebSocket.OPEN) {
      existing.refCount++;
      existing.lastUsed = Date.now();
      return existing.ws;
    }

    const ws = new WebSocket(url);

    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('WebSocket connect timeout')), 10000);
      ws.addEventListener('open', () => {
        clearTimeout(timeout);
        resolve();
      });
      ws.addEventListener('error', () => {
        clearTimeout(timeout);
        reject(new Error('WebSocket connect failed'));
      });
    });

    const entry: PooledConnection = {
      ws,
      refCount: 1,
      lastUsed: Date.now(),
    };

    ws.addEventListener('close', () => {
      this.pools.delete(url);
    });

    this.pools.set(url, entry);
    return ws;
  }

  release(url: string): void {
    const entry = this.pools.get(url);
    if (!entry) return;

    entry.refCount--;
    entry.lastUsed = Date.now();

    if (entry.refCount <= 0 && entry.ws.readyState === WebSocket.OPEN) {
      entry.ws.close();
      this.pools.delete(url);
    }
  }

  cleanup(): void {
    const now = Date.now();
    for (const [url, entry] of this.pools) {
      if (entry.refCount <= 0 && now - entry.lastUsed > IDLE_TIMEOUT_MS) {
        if (entry.ws.readyState === WebSocket.OPEN) {
          entry.ws.close();
        }
        this.pools.delete(url);
      }
    }
  }
}
