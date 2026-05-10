import type { ProjectContext } from '../../core/types';
import type { GeneratedFile } from '../types';

const STRATEGY_LABEL: Record<string, string> = {
  'static':      'Hosting Estático (nginx)',
  'node-server': 'Servidor Node.js',
  'docker':      'Docker (genérico)',
  'edge':        'Edge (Cloudflare Workers / Deno Deploy)',
  'unknown':     'Indeterminado',
};

export function generateDockerReadme(ctx: ProjectContext): GeneratedFile {
  const analysis = ctx.analysis!;
  const plan     = ctx.plan!;
  const { projectName, framework, packageManager } = analysis;
  const strategy = plan.deployStrategy.recommended;
  const port     = strategy === 'static' ? 80 : 3000;
  const hasEnv   = plan.env.required.length > 0;

  const pmInstall: Record<string, string> = {
    npm:  'npm ci',
    yarn: 'yarn install --frozen-lockfile',
    pnpm: 'pnpm install --frozen-lockfile',
    bun:  'bun install',
  };
  const installCmd = pmInstall[packageManager] ?? 'npm ci';

  const lines: string[] = [
    `# Docker — ${projectName}`,
    '',
    `> Estratégia: **${STRATEGY_LABEL[strategy] ?? strategy}** | Framework: **${framework}** | Porta: **${port}**`,
    '',
    '## Pré-requisitos',
    '',
    '- [Docker](https://docs.docker.com/get-docker/) >= 24',
    '- [Docker Compose](https://docs.docker.com/compose/) >= 2.0',
    '',
    '## Como usar',
    '',
    '### 1. Copie os arquivos para a raiz do projeto',
    '',
    '```bash',
    '# Na raiz do seu projeto:',
    'cp <output>/docker/Dockerfile .',
    'cp <output>/docker/docker-compose.yml .',
    'cp <output>/docker/.dockerignore .dockerignore',
    '```',
  ];

  if (hasEnv) {
    lines.push(
      '',
      '### 2. Configure as variáveis de ambiente',
      '',
      '```bash',
      'cp <output>/env/.env.example .env',
      '# Edite .env com os valores reais',
      '```',
      '',
      'Variáveis obrigatórias:',
      ...plan.env.required.map((v) => `- \`${v}\``),
    );
  }

  const nextStep = hasEnv ? 3 : 2;

  lines.push(
    '',
    `### ${nextStep}. Build e execução`,
    '',
    '```bash',
    '# Build e iniciar (modo detach)',
    'docker compose up -d --build',
    '',
    '# Ver logs',
    'docker compose logs -f app',
    '',
    '# Parar',
    'docker compose down',
    '```',
    '',
    `A aplicação estará disponível em: **http://localhost:${port}**`,
    '',
    '## Build manual (sem Compose)',
    '',
    '```bash',
    `docker build -t ${projectName.toLowerCase().replace(/\s+/g, '-')} .`,
    `docker run -p ${port}:${port}${hasEnv ? ' --env-file .env' : ''} ${projectName.toLowerCase().replace(/\s+/g, '-')}`,
    '```',
  );

  if (plan.infrastructure.requiresSupabase) {
    lines.push(
      '',
      '## Supabase',
      '',
      '> O Supabase opera como serviço externo — não é incluído no container.',
      '> Certifique-se de que as variáveis `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` estão configuradas no `.env`.',
    );
  }

  lines.push(
    '',
    '## Detalhes do Dockerfile',
    '',
    `- **Build system**: \`${installCmd}\` → \`build\``,
    `- **Imagem base**: \`${strategy === 'static' ? 'nginx:alpine' : 'node:18-alpine'}\``,
    `- **Porta exposta**: ${port}`,
    `- **Multi-stage build**: sim (otimiza tamanho da imagem final)`,
    '',
    '---',
    '*Gerado pelo lovable-migrate — engine de migração para projetos Lovable.dev*',
    '',
  );

  return {
    relativePath: 'docker/README.md',
    content: lines.join('\n'),
    description: 'README com instruções de uso dos artefatos Docker',
  };
}
