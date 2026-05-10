import type { ProjectContext } from '../../core/types';
import type { FolderReadmeArtifacts, GeneratedFile } from '../types';

function readme(relativePath: string, title: string, lines: string[]): GeneratedFile {
  return {
    relativePath,
    content: [`# ${title}`, '', ...lines, ''].join('\n'),
    description: `Documentação da pasta ${relativePath.replace('/README.md', '') || 'raiz'}`,
  };
}

export function generateFolderReadmes(ctx: ProjectContext): FolderReadmeArtifacts {
  const analysis = ctx.analysis!;
  const plan     = ctx.plan!;

  const { projectName, framework, buildSystem } = analysis;
  const files: GeneratedFile[] = [];

  // ── README raiz ────────────────────────────────────────────────────────────
  files.push(readme('README.md', `Pacote de Migração — ${projectName}`, [
    'Gerado pelo **lovable-migrate**. Este diretório contém todos os artefatos',
    'necessários para migrar o projeto para um ambiente self-hosted.',
    '',
    '## Estrutura',
    '',
    '```',
    `${projectName}/`,
    '├── env/                 # Variáveis de ambiente (templates)',
    ...(analysis.supabase.detected ? [
      '├── supabase/',
      '│   ├── migrations/      # SQL de migrations',
      '│   └── functions/       # Edge Functions',
    ] : []),
    '├── deploy/              # Instruções e scripts de deploy',
    '└── reports/             # Relatórios de migração',
    '```',
    '',
    '## Próximos passos',
    '',
    '1. Leia `deploy/deploy-instructions.md` para instruções completas',
    '2. Configure as variáveis de ambiente em `env/.env.example`',
    '3. Consulte `reports/migration-summary.json` para visão geral',
    '',
    `> Framework: **${framework}** | Build: **${buildSystem}**`,
    `> Estratégia de deploy: **${plan.deployStrategy.recommended}**`,
  ]));

  // ── env/ ───────────────────────────────────────────────────────────────────
  files.push(readme('env/README.md', 'Variáveis de Ambiente', [
    'Contém templates de variáveis de ambiente para o projeto.',
    '',
    '| Arquivo                    | Uso                                    |',
    '|----------------------------|----------------------------------------|',
    '| `.env.example`             | Template para desenvolvimento local    |',
    '| `.env.production.example`  | Template para ambiente de produção     |',
    '',
    '## Como usar',
    '',
    '```bash',
    'cp .env.example ../../.env',
    '# Edite .env e preencha os valores',
    '```',
    '',
    plan.env.required.length > 0
      ? `## Variáveis obrigatórias (${plan.env.required.length})\n\n${plan.env.required.map((v) => `- \`${v}\``).join('\n')}`
      : '## Variáveis de ambiente\n\nNenhuma variável detectada neste projeto.',
  ]));

  // ── supabase/ (condicional) ────────────────────────────────────────────────
  if (analysis.supabase.detected) {
    const subLines = [
      'Contém artefatos do Supabase exportados do projeto original.',
      '',
      '> **Importante:** execute as migrations e deploy das edge functions',
      '> na sua instância própria do Supabase — não no projeto original.',
    ];

    if (analysis.supabase.migrations.count > 0) {
      subLines.push(
        '',
        `## migrations/ (${analysis.supabase.migrations.count} arquivo(s))`,
        '',
        'Execute com:',
        '```bash',
        'supabase db push',
        '```',
      );
    }

    if (analysis.supabase.edgeFunctions.count > 0) {
      subLines.push(
        '',
        `## functions/ (${analysis.supabase.edgeFunctions.count} função(ões))`,
        '',
        'Deploy com:',
        '```bash',
        'supabase functions deploy',
        '```',
      );
    }

    files.push(readme('supabase/README.md', 'Artefatos do Supabase', subLines));
  }

  // ── deploy/ ────────────────────────────────────────────────────────────────
  files.push(readme('deploy/README.md', 'Deploy', [
    'Contém instruções e configurações de deploy.',
    '',
    '| Arquivo                    | Descrição                              |',
    '|----------------------------|----------------------------------------|',
    '| `deploy-instructions.md`   | Guia completo de deploy com comandos   |',
    '',
    'Leia `deploy-instructions.md` para o passo a passo completo.',
  ]));

  // ── reports/ ──────────────────────────────────────────────────────────────
  files.push(readme('reports/README.md', 'Relatórios', [
    'Contém relatórios gerados pelo lovable-migrate.',
    '',
    '| Arquivo                    | Descrição                              |',
    '|----------------------------|----------------------------------------|',
    '| `migration-summary.json`   | Sumário completo da migração           |',
    '',
    '`migration-summary.json` lista todos os artefatos gerados, riscos detectados',
    'e passos manuais pendentes.',
  ]));

  return { files };
}
