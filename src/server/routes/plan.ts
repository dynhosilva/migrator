import type { FastifyPluginAsync } from 'fastify';
import { analyzeContext } from '../../analyzer';
import { planContext } from '../../planner';
import { apiSuccess } from '../types';
import { createProjectContext, wrapPhase } from '../pipeline';
import { serializePlan } from '../serializers/context';

interface Body { input: string }

const planRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.post<{ Body: Body }>('/plan', {
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

    const ctx      = await createProjectContext(input);
    const analyzed = wrapPhase('analyze', () => analyzeContext(ctx));
    const planned  = wrapPhase('plan',    () => planContext(analyzed));

    return apiSuccess(serializePlan(planned), 'plan', Date.now() - startMs, request.id as string);
  });
};

export default planRoutes;
