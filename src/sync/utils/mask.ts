// JWT pattern — used to detect and redact service keys that leak into error messages
const JWT_RE = /eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/g;

export function maskKey(key: string): string {
  if (!key || key.length < 12) return '***';
  return `${key.slice(0, 12)}…[REDACTED]`;
}

export function sanitizeMessage(msg: string): string {
  return msg.replace(JWT_RE, m => maskKey(m));
}

export function sanitizeError(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err);
  return sanitizeMessage(msg);
}
