// ─── Corpo das requisições ─────────────────────────────────────────────────────

/** Requisição base — campos comuns a todos os endpoints de análise. */
export interface CoreRequest {
  readonly input: string;
}

/** Requisição para endpoints que escrevem artefatos em disco. */
export interface ArtifactRequest extends CoreRequest {
  readonly output?: string;
  readonly force?: boolean;
}

/** Requisição para o endpoint /remote com opções SSH e de host. */
export interface RemoteRequest extends ArtifactRequest {
  readonly sshConfig?: {
    readonly host?: string;
    readonly port?: number;
    readonly user?: string;
    readonly keyPath?: string;
    readonly authStrategy?: 'key' | 'password';
  };
  readonly remotePath?: string;
}

// ─── Envelope de resposta ────────────────────────────────────────────────────

export interface ApiSuccess<T extends Record<string, unknown>> {
  readonly success: true;
  readonly requestId: string;
  readonly durationMs: number;
  readonly phase: string;
  readonly data: T;
}

export interface ApiErrorBody {
  readonly success: false;
  readonly requestId: string;
  readonly durationMs: number;
  readonly error: {
    readonly code: string;
    readonly message: string;
    readonly phase: string;
    readonly details?: unknown;
  };
}

export type ApiResponse<T extends Record<string, unknown>> = ApiSuccess<T> | ApiErrorBody;

// ─── Helpers de construção de resposta ────────────────────────────────────────

export function apiSuccess<T extends Record<string, unknown>>(
  data: T,
  phase: string,
  durationMs: number,
  requestId: string,
): ApiSuccess<T> {
  return { success: true, requestId, durationMs, phase, data };
}
