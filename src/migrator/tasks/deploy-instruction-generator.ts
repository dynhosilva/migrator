import type { ProjectContext } from '../../core/types';
import type { DeployInstructionsArtifact, GeneratedFile } from '../types';
import type { DeployTarget } from '../../planner/types';

const DEPLOY_LABEL: Record<DeployTarget, string> = {
  'static':      'Hosting Estático (CDN / Netlify / Vercel / S3)',
  'node-server': 'Servidor Node.js (VPS / Railway / Render)',
  'docker':      'Docker',
  'edge':        'Edge (Cloudflare Workers / Deno Deploy)',
  'unknown':     'Indeterminado — verificar manualmente',
};

// Mapeia package manager → comando de instalação correto
const PM_INSTALL: Record<string, string> = {
  npm:  'npm install',
  yarn: 'yarn',
  pnpm: 'pnpm install',
  bun:  'bun install',
};

function section(title: string, lines: string[]): string {
  return [`\n## ${title}\n`, ...lines].join('\n');
}

function step(n: number, title: string, lines: string[]): string {
  return [`\n### ${n}. ${title}\n`, ...lines].join('\n');
}

function buildStaticDeploySection(n: number, pmRun: string, buildSystem: string): string {
  const bs = buildSystem !== 'unknown' ? buildSystem : 'build tool';
  return step(n, 'Deploy — Hosting Estático', [
    `Após o build, a pasta \`dist/\` contém o bundle estático pronto para hospedagem.`,
    '',
    '**Opção A — Netlify:**',
    '```bash',
    '# Arraste a pasta dist/ para app.netlify.com/drop',
    '# ou instale a CLI: npm install -g netlify-cli',
    'netlify deploy --prod --dir=dist',
    '```',
    '',
    '**Opção B — Vercel:**',
    '```bash',
    'npm install -g vercel',
    'vercel --prod',
    '```',
    '',
    '**Opção C — Servidor próprio (Nginx):**',
    '```bash',
    '# Copie o conteúdo de dist/ para o diretório raiz do Nginx',
    'sudo cp -r dist/* /var/www/html/',
    '```',
    '',
    `> Build system: **${bs}**. Comando de build: \`${pmRun} build\``,
  ]);
}

function buildNodeServerDeploySection(n: number, pmRun: string, pmInst: string): string {
  return step(n, 'Deploy — Servidor Node.js', [
    'Next.js requer um servidor Node.js ativo.',
    '',
    '**Opção A — PM2 (VPS):**',
    '```bash',
    `${pmInst}`,
    `${pmRun} build`,
    'npx pm2 start npm --name "app" -- start',
    '```',
    '',
    '**Opção B — Docker:**',
    '```dockerfile',
    'FROM node:18-alpine',
    'WORKDIR /app',
    'COPY . .',
    `RUN ${pmInst} && ${pmRun} build`,
    'EXPOSE 3000',
    'CMD ["node", "server.js"]',
    '```',
    '',
    '**Opção C — Railway / Render:**',
    '```',
    `# Build command: ${pmRun} build`,
    `# Start command: ${pmRun} start`,
    '# Node version: >= 18',
    '```',
  ]);
}

export function generateDeployInstructions(ctx: ProjectContext): DeployInstructionsArtifact {
  const analysis = ctx.analysis!;
  const plan     = ctx.plan!;

  const { framework, buildSystem, packageManager } = analysis;
  const { deployStrategy, env, supabase: supabasePlan, risks, checklist } = plan;

  const now    = new Date().toISOString();
  const pmRun  = packageManager !== 'npm' ? `${packageManager} run` : 'npm run';
  const pmInst = PM_INSTALL[packageManager] ?? 'npm install';

  const lines: string[] = [
    `# Instruções de Deploy — ${analysis.projectName}`,
    '',
    `> Gerado pelo **lovable-migrate** em ${now}`,
    `> Framework: **${framework}** | Build: **${buildSystem}** | Package manager: **${packageManager}**`,
    '',
    section('Visão Geral', [
      '| Campo             | Valor                                    |',
      '|-------------------|------------------------------------------|',
      `| Estratégia        | ${DEPLOY_LABEL[deployStrategy.recommended]} |`,
      `| Confiança         | ${deployStrategy.confidence}             |`,
      `| Supabase          | ${analysis.supabase.detected ? 'Sim' : 'Não'}                                   |`,
      `| Variáveis de env  | ${env.required.length} obrigatória(s)    |`,
      '',
      `> ${deployStrategy.reasoning}`,
    ]),
  ];

  // Pré-requisitos
  const prereqs = ['- Node.js >= 18 ([nodejs.org](https://nodejs.org))'];
  if (packageManager !== 'npm') {
    const pmLinks: Record<string, string> = {
      yarn: 'https://yarnpkg.com',
      pnpm: 'https://pnpm.io',
      bun:  'https://bun.sh',
    };
    prereqs.push(`- ${packageManager} ([instalar](${pmLinks[packageManager] ?? 'https://npmjs.com'}))`);
  }
  if (supabasePlan.requiresEdgeFunctions) {
    prereqs.push('- Supabase CLI ([instalar](https://supabase.com/docs/guides/cli))');
  }
  lines.push(section('Pré-requisitos', prereqs));

  // Variáveis de ambiente (seção informativa, antes dos passos)
  if (env.required.length > 0) {
    const envLines = [
      'Copie o arquivo de template e preencha os valores:',
      '```bash',
      'cp env/.env.example .env',
      '```',
      '',
      'Variáveis obrigatórias:',
      ...env.required.map((v) => `- \`${v}\``),
    ];
    if (plan.infrastructure.requiresSupabase) {
      envLines.push('', '> Obtenha os valores em: app.supabase.com → Settings → API');
    }
    lines.push(section('Configurar Variáveis de Ambiente', envLines));
  }

  // ── Passos de Migração (numerados sequencialmente) ─────────────────────────
  lines.push('\n## Passos de Migração\n');

  // Contador sequencial — garante numeração contínua independente de passos opcionais
  let stepNum = 0;
  const nextStep = (): number => ++stepNum;

  // Passo: instalar dependências
  lines.push(
    step(nextStep(), 'Instalar Dependências', [
      '```bash',
      pmInst,
      '```',
    ]),
  );

  // Passo: Supabase (condicional)
  if (supabasePlan.requiresOwnInstance) {
    const subLines: string[] = [
      '```',
      '1. Acesse https://app.supabase.com',
      '2. Crie um novo projeto',
      '3. Anote a URL e a chave anon (Settings → API)',
      '4. Adicione ao arquivo .env',
      '```',
    ];

    if (supabasePlan.requiresMigrations) {
      subLines.push(
        '',
        '**Executar migrations:**',
        '```bash',
        'supabase login',
        'supabase link --project-ref <seu-project-ref>',
        'supabase db push',
        '```',
        '',
        '> Os arquivos SQL estão em `supabase/migrations/`',
      );
    }

    if (supabasePlan.requiresAuth) {
      subLines.push(
        '',
        '**Configurar autenticação:**',
        '- Acesse Authentication → Providers no dashboard do Supabase',
        '- Configure os providers utilizados (Email, Google, GitHub, etc.)',
      );
    }

    if (supabasePlan.requiresStorage) {
      subLines.push(
        '',
        '**Configurar Storage:**',
        '- Crie os buckets necessários em Storage → New bucket',
        '- Configure as políticas de acesso (RLS)',
        '- Arquivos existentes precisam ser migrados manualmente',
      );
    }

    if (supabasePlan.requiresEdgeFunctions) {
      subLines.push(
        '',
        '**Deployar Edge Functions:**',
        '```bash',
        'supabase functions deploy',
        '```',
        '',
        '> Os arquivos estão em `supabase/functions/`',
      );
    }

    lines.push(step(nextStep(), 'Configurar Supabase', subLines));
  }

  // Passo: build
  lines.push(
    step(nextStep(), 'Build de Produção', [
      '```bash',
      `${pmRun} build`,
      '```',
    ]),
  );

  // Passo: verificação local
  lines.push(
    step(nextStep(), 'Verificar Localmente', [
      '```bash',
      framework === 'next' ? `${pmRun} start` : `${pmRun} preview`,
      '```',
    ]),
  );

  // Passo: deploy por estratégia
  if (deployStrategy.recommended === 'static') {
    lines.push(buildStaticDeploySection(nextStep(), pmRun, buildSystem));
  } else if (deployStrategy.recommended === 'node-server' || deployStrategy.recommended === 'docker') {
    lines.push(buildNodeServerDeploySection(nextStep(), pmRun, pmInst));
  } else {
    lines.push(step(nextStep(), 'Deploy', [
      '> Estratégia de deploy não determinada automaticamente.',
      '> Verifique o framework do projeto e escolha a estratégia adequada.',
    ]));
  }

  // Checklist de verificação
  if (checklist.length > 0) {
    const checkLines = checklist.map(
      (item) =>
        `- [ ] ${item.label}${item.required ? '' : ' *(opcional)*'}${item.notes ? `\n  > ${item.notes}` : ''}`,
    );
    lines.push(section('Checklist de Verificação', checkLines));
  }

  // Riscos identificados
  const significantRisks = risks.filter((r) => r.level === 'critical' || r.level === 'high');
  if (significantRisks.length > 0) {
    const riskLines = significantRisks.map(
      (r) =>
        `- **[${r.level.toUpperCase()}]** ${r.message}${r.suggestion ? `\n  → ${r.suggestion}` : ''}`,
    );
    lines.push(section('⚠️ Riscos Identificados', riskLines));
  }

  // Notas de compatibilidade
  if (plan.compatibility.reasons.length > 0) {
    lines.push(
      section('Notas de Compatibilidade', plan.compatibility.reasons.map((r) => `- ${r}`)),
    );
  }

  lines.push('\n---\n*Gerado pelo lovable-migrate — engine de migração para projetos Lovable.dev*\n');

  const file: GeneratedFile = {
    relativePath: 'deploy/deploy-instructions.md',
    content: lines.join('\n'),
    description: 'Instruções completas de deploy com comandos e checklist',
  };

  return { files: [file] };
}
