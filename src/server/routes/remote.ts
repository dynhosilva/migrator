import type { FastifyPluginAsync } from 'fastify';
import { analyzeContext } from '../../analyzer';
import { planContext } from '../../planner';
import { validateContext } from '../../validator';
import { migrateContext } from '../../migrator';
import { deployContext } from '../../deploy';
import { prepareContext } from '../../remote';
import type { RemoteOptions } from '../../remote/types';
import { apiSuccess } from '../types';
import { createProjectContext, wrapPhase, resolveOutputDir } from '../pipeline';
import { serializeRemote } from '../serializers/context';
import { ValidationBlockedError } from '../errors';

interface Body {
  input: string;
  output?: string;
  force?: boolean;
  sshConfig?: {
    host?: string;
    port?: number;
    user?: string;
    keyPath?: string;
    authStrategy?: 'key' | 'password';
  };
  remotePath?: string;
}

const remoteRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.post<{ Body: Body }>('/remote', {
    schema: {
      body: {
        type: 'object',
        required: ['input'],
        properties: {
          input:      { type: 'string', minLength: 1 },
          output:     { type: 'string' },
          force:      { type: 'boolean' },
          remotePath: { type: 'string' },
          sshConfig:  {
            type: 'object',
            properties: {
              host:         { type: 'string' },
              port:         { type: 'integer', minimum: 1, maximum: 65535 },
              user:         { type: 'string' },
              keyPath:      { type: 'string' },
              authStrategy: { type: 'string', enum: ['key', 'password'] },
            },
            additionalProperties: false,
          },
        },
        additionalProperties: false,
      },
    },
  }, async (request) => {
    const startMs = Date.now();
    const { input, output, force = false, sshConfig, remotePath } = request.body;
    const outputDir = resolveOutputDir(input, output);

    const ctx       = await createProjectContext(input);
    const analyzed  = wrapPhase('analyze',  () => analyzeContext(ctx));
    const planned   = wrapPhase('plan',     () => planContext(analyzed));
    const validated = wrapPhase('validate', () => validateContext(planned));

    if (!validated.validation?.safeToMigrate && !force) {
      const count = validated.validation?.summary.criticalCount ?? 0;
      throw new ValidationBlockedError(
        `Validação bloqueou o pipeline: ${count} issue(s) crítico(s). Use force=true para prosseguir.`,
        { blockingIssues: validated.validation?.blockingIssues },
      );
    }

    const migrated = wrapPhase('migrate', () => migrateContext(validated, outputDir));
    const deployed = wrapPhase('deploy',  () => deployContext(migrated, outputDir));

    const remoteOptions: RemoteOptions = { sshConfig, remotePath };
    const prepared = wrapPhase('remote', () => prepareContext(deployed, outputDir, remoteOptions));

    return apiSuccess(
      { ...serializeRemote(prepared), outputDir },
      'remote',
      Date.now() - startMs,
      request.id as string,
    );
  });
};

export default remoteRoutes;
