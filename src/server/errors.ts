/**
 * Hierarquia de erros tipados para a API do servidor.
 *
 * Cada subclasse mapeia para um código HTTP e um `code` de erro estruturado.
 * O error handler de `app.ts` detecta essas classes e serializa corretamente.
 */

export class ServerError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly phase: string,
    public readonly statusCode: number = 500,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = 'ServerError';
  }
}

/** Input inválido (400) — corpo da requisição ausente ou malformado. */
export class InputError extends ServerError {
  constructor(message: string, details?: unknown) {
    super('INPUT_ERROR', message, 'input', 400, details);
    this.name = 'InputError';
  }
}

/** Falha em uma fase do pipeline (422) — o input era válido mas a engine falhou. */
export class PipelineError extends ServerError {
  constructor(phase: string, message: string, details?: unknown) {
    super('PIPELINE_ERROR', message, phase, 422, details);
    this.name = 'PipelineError';
  }
}

/** Violação de sandbox (403) — comando não permitido pela whitelist. */
export class SandboxError extends ServerError {
  constructor(message: string) {
    super('SANDBOX_ERROR', message, 'runtime', 403);
    this.name = 'SandboxError';
  }
}

/** Erro na fase de planejamento remoto (422). */
export class RemoteError extends ServerError {
  constructor(message: string, details?: unknown) {
    super('REMOTE_ERROR', message, 'remote', 422, details);
    this.name = 'RemoteError';
  }
}

/** Validação bloqueou a migração (409) — use force=true para prosseguir. */
export class ValidationBlockedError extends ServerError {
  constructor(message: string, details?: unknown) {
    super('VALIDATION_BLOCKED', message, 'validate', 409, details);
    this.name = 'ValidationBlockedError';
  }
}
