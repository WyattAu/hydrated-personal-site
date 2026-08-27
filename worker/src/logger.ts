let currentTraceId: string | null = null;

export function setTraceId(traceId: string): void {
  currentTraceId = traceId;
}

export function getTraceId(): string | null {
  return currentTraceId;
}

export function log(level: string, message: string, meta: Record<string, unknown> = {}): void {
  const entry: Record<string, unknown> = {
    ts: new Date().toISOString(),
    level,
    msg: message,
    ...meta,
  };
  if (currentTraceId) {
    entry.trace_id = currentTraceId;
  }
  const serialized = JSON.stringify(entry);
  if (level === 'error') {
    console.error(serialized);
  } else if (level === 'warn') {
    console.warn(serialized);
  }
}

export function clearTraceId(): void {
  currentTraceId = null;
}
