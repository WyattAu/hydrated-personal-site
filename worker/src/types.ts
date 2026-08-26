export interface Env {
  ENVIRONMENT: string;
  GUESTBOOK?: KVNamespace;
  ADMIN_TOKEN?: string;
  AA_API_KEY?: string;
  PRICE_STREAM?: DurableObjectNamespace;
}
