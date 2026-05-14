export class SyncTimeoutError extends Error {
  readonly isTimeout = true;
  constructor(label: string, ms: number) {
    super(
      `Operação "${label}" excedeu o limite de ${Math.round(ms / 1000)}s. ` +
      `Verifique sua conexão com a internet ou aumente o timeout com --timeout.`,
    );
    this.name = 'SyncTimeoutError';
  }
}

export function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout>;
  const race = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new SyncTimeoutError(label, ms)), ms);
  });
  return Promise.race([promise, race]).finally(() => clearTimeout(timer));
}

export function fetchWithTimeout(url: string, init: RequestInit, ms: number): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  return fetch(url, { ...init, signal: controller.signal })
    .finally(() => clearTimeout(timer))
    .catch(err => {
      if (err instanceof Error && err.name === 'AbortError') {
        throw new SyncTimeoutError(url, ms);
      }
      throw err;
    });
}

export const DEFAULT_TIMEOUTS = {
  schemaFetch:      15_000,
  credentialCheck:  10_000,
  rowCount:         30_000,
  userListPage:     20_000,
  singleUpdate:     15_000,
  singleRestore:    15_000,
} as const;

export type TimeoutKey = keyof typeof DEFAULT_TIMEOUTS;
