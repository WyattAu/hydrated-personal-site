export interface Env {
  ENVIRONMENT: string;
  GUESTBOOK?: KVNamespace;
  /** OVATION aurora activity-index history (30-min snapshots, 14-day TTL). */
  AURORA_HISTORY?: KVNamespace;
  ADMIN_TOKEN?: string;
  AA_API_KEY?: string;
  PRICE_STREAM?: DurableObjectNamespace;
}
