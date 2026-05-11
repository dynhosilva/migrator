import Fastify, { type FastifyInstance, type FastifyRequest, type FastifyReply } from 'fastify';
import rateLimit from '@fastify/rate-limit';
import { ServerError } from './errors';
import { SandboxViolationError } from '../runtime';

import healthRoutes       from './routes/health';
import capabilitiesRoutes from './routes/capabilities';
import analyzeRoutes      from './routes/analyze';
import planRoutes         from './routes/plan';
import validateRoutes     from './routes/validate';
import migrateRoutes      from './routes/migrate';
import deployRoutes       from './routes/deploy';
import executeRoutes      from './routes/execute';
import remoteRoutes       from './routes/remote';

export interface AppOptions {
  readonly logger?: boolean;
  readonly rateLimit?: { max: number; timeWindow: string };
}

/**
 * Factory da aplicação Fastify — desacoplada do transporte (listen).
 *
 * Retorna instância configurada com:
 *   - Rate limiting (padrão: 200 req/min por IP)
 *   - Request ID automático via cabeçalho `x-request-id` ou gerado internamente
 *   - Timing automático por rota (campo `durationMs` nas respostas)
 *   - Error handler tipado (ServerError, SandboxViolationError, erros Fastify)
 *   - Todas as rotas registradas como plugins
 *
 * Testável sem listen: use `app.inject()` para testes unitários de rota.
 */
export async function buildApp(opts: AppOptions = {}): Promise<FastifyInstance> {
  const app = Fastify({
    logger:          opts.logger ?? false,
    requestIdHeader: 'x-request-id',
    genReqId:        () => `req-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
  });

  // ─── Rate limiting ───────────────────────────────────────────────────────────
  await app.register(rateLimit, {
    max:        opts.rateLimit?.max        ?? 200,
    timeWindow: opts.rateLimit?.timeWindow ?? '1 minute',
    errorResponseBuilder: (_request, context) => ({
      success:   false,
      requestId: null,
      durationMs: 0,
      error: {
        code:    'RATE_LIMIT_EXCEEDED',
        message: `Rate limit excedido — máximo ${context.max} requisições por ${context.after}.`,
        phase:   'transport',
      },
    }),
  });

  // ─── Error handler ────────────────────────────────────────────────────────────
  app.setErrorHandler((rawError: unknown, request: FastifyRequest, reply: FastifyReply) => {
    const requestId  = request.id as string;
    const durationMs = Date.now() - ((request as unknown as { startMs?: number }).startMs ?? Date.now());

    // Violação de sandbox (403)
    if (rawError instanceof SandboxViolationError) {
      return reply.status(403).send({
        success: false, requestId, durationMs,
        error: { code: 'SANDBOX_ERROR', message: rawError.message, phase: 'runtime' },
      });
    }

    // Erros tipados do servidor
    if (rawError instanceof ServerError) {
      return reply.status(rawError.statusCode).send({
        success: false, requestId, durationMs,
        error: {
          code:    rawError.code,
          message: rawError.message,
          phase:   rawError.phase,
          ...(rawError.details !== undefined ? { details: rawError.details } : {}),
        },
      });
    }

    // Erros de validação do Fastify (JSON Schema) — têm propriedade `validation`
    const fastifyErr = rawError as { validation?: unknown; message?: string };
    if (fastifyErr.validation) {
      return reply.status(400).send({
        success: false, requestId, durationMs,
        error: {
          code:    'SCHEMA_VALIDATION_ERROR',
          message: 'Corpo da requisição inválido.',
          phase:   'input',
          details: fastifyErr.validation,
        },
      });
    }

    // Fallback genérico
    reply.status(500).send({
      success: false, requestId, durationMs,
      error: { code: 'INTERNAL_ERROR', message: 'Erro interno do servidor.', phase: 'unknown' },
    });
  });

  // ─── 404 handler ─────────────────────────────────────────────────────────────
  app.setNotFoundHandler((request: FastifyRequest, reply: FastifyReply) => {
    reply.status(404).send({
      success: false,
      requestId: request.id,
      durationMs: 0,
      error: {
        code:    'NOT_FOUND',
        message: `Rota não encontrada: ${request.method} ${request.url}`,
        phase:   'transport',
      },
    });
  });

  // ─── Timing hook ──────────────────────────────────────────────────────────────
  app.addHook('onRequest', (request, _reply, done) => {
    (request as unknown as { startMs: number }).startMs = Date.now();
    done();
  });

  // ─── Rotas ────────────────────────────────────────────────────────────────────
  await app.register(healthRoutes);
  await app.register(capabilitiesRoutes);
  await app.register(analyzeRoutes);
  await app.register(planRoutes);
  await app.register(validateRoutes);
  await app.register(migrateRoutes);
  await app.register(deployRoutes);
  await app.register(executeRoutes);
  await app.register(remoteRoutes);

  return app;
}
