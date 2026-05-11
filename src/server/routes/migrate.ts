import type { FastifyPluginAsync } from 'fastify';
import { analyzeContext } from '../../analyzer';
import { planContext } from '../../planner';
import { validateContext } from '../../validator';
import { migrateContext } from '../../migrator';
import { apiSuccess } from '../types';
import { createProjectContext, wrapPhase, resolveOutputDir } from '../pipeline';
import { serializeMigration } from '../serializers/context';
import { ValidationBlockedError } from '../errors';

interface Body { input: string; output?: string; force?: boolean }

const migrateRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.post<{ Body: Body }>('/migrate', {
    schema: {
      body: {
        type: 'object',
        required: ['input'],
        properties: {
          input:  { type: 'string', minLength: 1 },
          output: { type: 'string' },
          force:  { type: 'boolean' },
        },
        additionalProperties: false,
      },
    },
  }, async (request) => {
    const startMs = Date.now();
    const { input, output, force = false } = request.body;
    const outputDir = resolveOutputDir(input, output);

    const ctx       = await createProjectContext(input);
    const analyzed  = wrapPhase('analyze',  () => analyzeContext(ctx));
    const planned   = wrapPhase('plan',     () => planContext(analyzed));
    const validated = wrapPhase('validate', () => validateContext(planned));

    if (!validated.validation?.safeToMigrate && !force) {
      const count = validated.validation?.summary.criticalCount ?? 0;
      throw new ValidationBlockedError(
        `Validação bloqueou a migração: ${count} issue(s) crítico(s). Use force=true para prosseguir.`,
        { blockingIssues: validated.validation?.blockingIssues },
      );
    }

    const migrated = wrapPhase('migrate', () => migrateContext(validated, outputDir));

    return apiSuccess(
      { ...serializeMigration(migrated), outputDir },
      'migrate',
      Date.now() - startMs,
      request.id as string,
    );
  });
};

export default migrateRoutes;
