import type { ProjectContext } from '../../core/types';
import type { GeneratedFile } from '../types';

export function generateDockerignore(ctx: ProjectContext): GeneratedFile {
  const framework = ctx.analysis!.framework;

  const base = [
    '# Dependências',
    'node_modules',
    '',
    '# Artefatos de build',
    'dist',
    'build',
    '',
    '# Controle de versão',
    '.git',
    '.gitignore',
    '',
    '# Variáveis de ambiente (nunca incluir no container)',
    '.env',
    '.env.*',
    '!.env.example',
    '',
    '# Logs e temporários',
    '*.log',
    'npm-debug.log*',
    'yarn-debug.log*',
    'yarn-error.log*',
    '',
    '# Cobertura de testes e CI',
    'coverage',
    '.nyc_output',
    '',
    '# Sistema operacional',
    '.DS_Store',
    'Thumbs.db',
    '',
    '# Editor',
    '.vscode',
    '.idea',
    '*.swp',
    '*.swo',
  ];

  if (framework === 'next') {
    base.splice(3, 0, '.next', '.next/cache');
  }

  return {
    relativePath: 'docker/.dockerignore',
    content: base.join('\n') + '\n',
    description: '.dockerignore para excluir arquivos desnecessários da imagem',
  };
}
