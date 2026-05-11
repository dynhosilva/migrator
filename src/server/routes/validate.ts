import type { FastifyPluginAsync } from 'fastify';
import { analyzeContext } from '../../analyzer';
import { planContext } from '../../planner';
import { validateContext } from '../../validator';
import { apiSuccess } from '../types';
import { createProjectContext, wrapPhase } from '../pipeline';
import { serializeValidation } from '../serializers/context';

interface Body { input: string }

const validateRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.post<{ Body: Body }>('/validate', {
    schema: {
      body: {
        type: 'object',
        required: ['input'],
        properties: {
          input: { type: 'string', minLength: 1 },
        },
        additionalProperties: false,
      },
    },
  }, async (request) => {
    const startMs = Date.now();
    const { input } = request.body;

    const ctx       = await createProjectContext(input);
    const analyzed  = wrapPhase('analyze',  () => analyzeContext(ctx));
    const planned   = wrapPhase('plan',     () => planContext(analyzed));
    const validated = wrapPhase('validate', () => validateContext(planned));

    return apiSuccess(serializeValidation(validated), 'validate', Date.now() - startMs, request.id as string);
  });
};

export default validateRoutes;
