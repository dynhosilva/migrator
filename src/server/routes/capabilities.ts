import type { FastifyPluginAsync } from 'fastify';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const pkg = require('../../../package.json') as { version: string };

const CAPABILITIES = {
  phases: ['analyze', 'plan', 'validate', 'migrate', 'deploy', 'execute', 'remote'],
  endpoints: [
    { method: 'GET',  path: '/health',       description: 'Verifica o status do servidor' },
    { method: 'GET',  path: '/capabilities', description: 'Lista capacidades e fases disponíveis' },
    { method: 'GET',  path: '/version',      description: 'Versão da engine' },
    { method: 'POST', path: '/analyze',      description: 'Analisa stack do projeto' },
    { method: 'POST', path: '/plan',         description: 'Gera plano de migração' },
    { method: 'POST', path: '/validate',     description: 'Valida segurança do plano' },
    { method: 'POST', path: '/migrate',      description: 'Gera artefatos de migração' },
    { method: 'POST', path: '/deploy',       description: 'Gera artefatos Docker' },
    { method: 'POST', path: '/execute',      description: 'Verifica ambiente e gera plano de execução' },
    { method: 'POST', path: '/remote',       description: 'Planeja deploy remoto (sem SSH real)' },
  ],
  inputSources: ['local-folder', 'zip-file', 'git-repository'],
};

// eslint-disable-next-line @typescript-eslint/require-await
const capabilitiesRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get('/capabilities', async () => {
    return { success: true, data: CAPABILITIES };
  });

  fastify.get('/version', async () => {
    return {
      success: true,
      data: {
        version: pkg.version,
        engine:  'lovable-migrate',
      },
    };
  });
};

export default capabilitiesRoutes;
