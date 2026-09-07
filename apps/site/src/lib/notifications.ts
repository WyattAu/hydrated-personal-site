/**
 * Browser notification helper — wraps the Notification API with
 * permission-aware no-ops so callers never need to check support.
 */

export function createNotification(
  title: string,
  options?: NotificationOptions & { tag?: string },
): void {
  if (!('Notification' in window)) return;
  if (Notification.permission !== 'granted') return;
  try {
    new Notification(title, options);
  } catch {
    /* notification failed (e.g. mobile bg) — silently ignore */
  }
}

export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!('Notification' in window)) return 'denied';
  if (Notification.permission === 'granted') return 'granted';
  return Notification.requestPermission();
}
