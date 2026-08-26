import { createSignal, onCleanup } from 'solid-js';

type Status = 'connecting' | 'connected' | 'disconnected' | 'reconnecting';

interface WsOptions {
  onMessage?: (data: unknown) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
  reconnect?: boolean;
  maxReconnectAttempts?: number;
}

export function createWsConnection(url: string, options: WsOptions = {}) {
  const {
    onMessage,
    onConnect,
    onDisconnect,
    reconnect = true,
    maxReconnectAttempts = 10,
  } = options;

  const [status, setStatus] = createSignal<Status>('connecting');
  let ws: WebSocket | null = null;
  let reconnectAttempts = 0;
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  let closed = false;

  const connect = () => {
    if (closed) return;

    setStatus('connecting');
    ws = new WebSocket(url);

    ws.addEventListener('open', () => {
      reconnectAttempts = 0;
      setStatus('connected');
      onConnect?.();
    });

    ws.addEventListener('message', (event) => {
      try {
        const data = JSON.parse(event.data as string);
        onMessage?.(data);
      } catch {
        onMessage?.(event.data);
      }
    });

    ws.addEventListener('close', () => {
      setStatus('disconnected');
      onDisconnect?.();

      if (!closed && reconnect && reconnectAttempts < maxReconnectAttempts) {
        reconnectAttempts++;
        setStatus('reconnecting');
        const delay = Math.min(1000 * 2 ** (reconnectAttempts - 1), 30000);
        reconnectTimer = setTimeout(connect, delay);
      }
    });

    ws.addEventListener('error', () => {
      ws?.close();
    });
  };

  const send = (data: unknown) => {
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    if (ws.bufferedAmount > 1024 * 1024) return;
    ws.send(typeof data === 'string' ? data : JSON.stringify(data));
  };

  const close = () => {
    closed = true;
    if (reconnectTimer) clearTimeout(reconnectTimer);
    ws?.close();
  };

  connect();

  onCleanup(close);

  return { send, close, status };
}
