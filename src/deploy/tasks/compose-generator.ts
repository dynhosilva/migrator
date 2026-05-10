import type { ProjectContext } from '../../core/types';
import type { GeneratedFile } from '../types';

export function generateComposeFile(ctx: ProjectContext): GeneratedFile {
  const analysis  = ctx.analysis!;
  const plan      = ctx.plan!;
  const { packageManager } = analysis;
  const strategy  = plan.deployStrategy.recommended;
  const hasEnvVars = plan.env.required.length > 0;

  const port      = strategy === 'static' ? '80:80' : '3000:3000';

  const pmCmd: Record<string, string[]> = {
    npm:  ['npm', 'start'],
    yarn: ['yarn', 'start'],
    pnpm: ['pnpm', 'start'],
    bun:  ['bun', 'start'],
  };
  const startCmd = JSON.stringify(pmCmd[packageManager] ?? ['npm', 'start']);

  const lines: string[] = [
    'version: "3.8"',
    '',
    'services:',
    '  app:',
    '    build:',
    '      context: .',
    '      dockerfile: Dockerfile',
    `    ports:`,
    `      - "${port}"`,
  ];

  if (hasEnvVars) {
    lines.push('    env_file:');
    lines.push('      - .env');
  }

  if (strategy !== 'static') {
    lines.push(`    command: ${startCmd}`);
  }

  lines.push('    restart: unless-stopped');

  if (strategy !== 'static') {
    lines.push('    healthcheck:');
    lines.push('      test: ["CMD", "wget", "-qO-", "http://localhost:3000/"]');
    lines.push('      interval: 30s');
    lines.push('      timeout: 10s');
    lines.push('      retries: 3');
  }

  lines.push('');

  return {
    relativePath: 'docker/docker-compose.yml',
    content: lines.join('\n'),
    description: 'docker-compose.yml para deploy em ambiente de produção',
  };
}
