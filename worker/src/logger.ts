export function log(level: string, message: string, meta: Record<string, unknown> = {}): void {
  const entry = JSON.stringify({ ts: new Date().toISOString(), level, msg: message, ...meta });
  if (level === 'error') {
    console.error(entry);
  } else if (level === 'warn') {
    console.warn(entry);
  }
}
