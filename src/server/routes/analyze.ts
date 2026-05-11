import type { FastifyPluginAsync } from 'fastify';
import { analyzeContext } from '../../analyzer';
import { apiSuccess } from '../types';
import { createProjectContext, wrapPhase } from '../pipeline';
import { serializeAnalysis } from '../serializers/context';

interface Body { input: string }

const analyzeRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.post<{ Body: Body }>('/analyze', {
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

    return apiSuccess(serializeAnalysis(analyzed), 'analyze', Date.now() - startMs, request.id as string);
  });
};

export default analyzeRoutes;
