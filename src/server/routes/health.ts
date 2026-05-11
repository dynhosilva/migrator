import type { FastifyPluginAsync } from 'fastify';

// eslint-disable-next-line @typescript-eslint/require-await
const healthRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get('/health', {
    schema: {
      response: {
        200: {
          type: 'object',
          properties: {
            success:   { type: 'boolean' },
            status:    { type: 'string' },
            uptime:    { type: 'number' },
            timestamp: { type: 'string' },
          },
        },
      },
    },
  }, async () => {
    return {
      success:   true,
      status:    'ok',
      uptime:    Math.floor(process.uptime()),
      timestamp: new Date().toISOString(),
    };
  });
};

export default healthRoutes;
