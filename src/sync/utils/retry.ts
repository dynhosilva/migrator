export interface RetryOptions {
  maxAttempts: number;
  baseDelayMs: number;
  maxDelayMs: number;
}

export const DEFAULT_RETRY: RetryOptions = {
  maxAttempts: 3,
  baseDelayMs: 1_000,
  maxDelayMs: 30_000,
};

const RETRYABLE_STATUS = new Set([429, 502, 503, 504]);
const RETRYABLE_MSG = ['ENOTFOUND', 'ECONNRESET', 'ECONNREFUSED', 'ETIMEDOUT', 'fetch failed', 'network error'];

export function isRetryable(err: unknown): boolean {
  if (!err) return false;
  const msg = err instanceof Error ? err.message : String(err);
  if (RETRYABLE_MSG.some(s => msg.toLowerCase().includes(s.toLowerCase()))) return true;
  if (typeof err === 'object' && err !== null && 'status' in err) {
    return RETRYABLE_STATUS.has((err as { status: number }).status);
  }
  const statusMatch = msg.match(/\b(429|502|503|504)\b/);
  return statusMatch !== null;
}

function jitter(ms: number): number {
  return ms + Math.floor(Math.random() * Math.min(ms * 0.3, 1_000));
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  opts: RetryOptions,
  label: string,
): Promise<T> {
  let lastErr: unknown;
  for (let attempt = 1; attempt <= opts.maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (!isRetryable(err) || attempt === opts.maxAttempts) throw err;
      const base = Math.min(opts.baseDelayMs * 2 ** (attempt - 1), opts.maxDelayMs);
      const delay = jitter(base);
      // Intentional console for operational visibility — not a logging framework call
      process.stderr.write(`[sync] retry ${attempt}/${opts.maxAttempts - 1} em ${label} (${delay}ms)\n`);
      await new Promise(r => setTimeout(r, delay));
    }
  }
  throw lastErr;
}
