import { buildApp } from './app';
import { logger } from '../logger';

export interface ServerStartOptions {
  readonly port?: number;
  readonly host?: string;
}

/**
 * Inicializa e inicia o servidor HTTP.
 *
 * Separado de `buildApp()` para que testes possam usar a factory
 * sem abrir uma porta de rede real.
 */
export async function startServer(opts: ServerStartOptions = {}): Promise<void> {
  const port = opts.port ?? 3001;
  const host = opts.host ?? '127.0.0.1';

  const app = await buildApp({ logger: true });

  try {
    const address = await app.listen({ port, host });
    logger.info(`Servidor iniciado em ${address}`);
    logger.info(`Endpoints disponíveis em http://${host}:${port}/capabilities`);
  } catch (err) {
    logger.error(`Falha ao iniciar servidor: ${(err as Error).message}`);
    process.exit(1);
  }

  const shutdown = async (signal: string) => {
    logger.info(`Sinal ${signal} recebido — encerrando servidor...`);
    await app.close();
    process.exit(0);
  };

  process.once('SIGTERM', () => void shutdown('SIGTERM'));
  process.once('SIGINT',  () => void shutdown('SIGINT'));
}

export { buildApp } from './app';
export type { AppOptions } from './app';
export * from './types';
export * from './errors';
