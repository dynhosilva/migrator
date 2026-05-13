import chalk from 'chalk';
import { createContext }   from '../core';
import { analyzeContext }  from '../analyzer';
import { planContext }     from '../planner';
import { validateContext } from '../validator';
import { TerminalRenderer } from '../output';
import { setSilent }       from '../logger';
import { DEMO_FILES }      from './fixture';
import type { ProjectSource } from '../sources/types';
import type { ProjectContext } from '../core/types';

const DEMO_NAME = 'my-saas-app';
const W = 56;

const SEP  = chalk.gray(`  ${'─'.repeat(W)}`);
const BSEP = chalk.bold.gray(`  ${'━'.repeat(W)}`);

const demoSource: ProjectSource = {
  kind: 'local',
  load: async () => DEMO_FILES,
  describe: () => 'demo embutido (React + Vite + Supabase + TypeScript)',
};

function renderBanner(): void {
  console.log('');
  console.log(chalk.bold.cyan(`  ╔${'═'.repeat(W - 2)}╗`));
  console.log(chalk.bold.cyan(`  ║${'  lovable-migrate · demo'.padEnd(W - 2)}║`));
  console.log(chalk.bold.cyan(`  ╚${'═'.repeat(W - 2)}╝`));
  console.log('');
  console.log(`  ${chalk.white.bold('Projeto de exemplo:')} ${chalk.cyan(DEMO_NAME)}`);
  console.log(`  ${chalk.gray('React 18 · TypeScript · Vite · Supabase · Tailwind · shadcn/ui')}`);
  console.log('');
  console.log(`  ${chalk.dim('analyze → plan → validate')}`);
  console.log('');
}

function renderArtifacts(ctx: ProjectContext): void {
  const analysis = ctx.analysis!;
  const plan     = ctx.plan!;

  const envCount = analysis.envVars.length;
  const migCount = analysis.supabase.migrations.count;
  const fnCount  = analysis.supabase.edgeFunctions.count;
  const strategy = plan.deployStrategy.recommended;
  const baseImg  = strategy === 'static' ? 'nginx:alpine' : 'node:20-alpine';

  console.log('');
  console.log(chalk.bold.white(`  ┌${'─'.repeat(W - 2)}┐`));
  console.log(chalk.bold.white(`  │${'  O que deploy geraria para este projeto'.padEnd(W - 2)}│`));
  console.log(chalk.bold.white(`  └${'─'.repeat(W - 2)}┘`));
  console.log('');

  const T = (label: string, note: string = '') => {
    if (note) {
      console.log(`  ${chalk.green('✓')}  ${chalk.white(label.padEnd(34))}${chalk.gray(note)}`);
    } else {
      console.log(`  ${chalk.green('✓')}  ${chalk.white(label)}`);
    }
  };

  const H = (label: string) => {
    console.log(`  ${chalk.gray(label)}`);
  };

  H('GitHub Actions');
  T('.github/workflows/ci.yml',      'push + PR · Node [20, 22] · npm cache');
  T('.github/workflows/release.yml', 'tag v* · npm publish --dry-run');
  console.log('');

  H('Docker');
  T('docker/Dockerfile',             `multi-stage · ${baseImg}`);
  T('docker/docker-compose.yml',     'healthcheck · volumes');
  T('docker/.dockerignore');
  console.log('');

  H('Configuração');
  T('env/.env.example',              `${envCount} ${envCount === 1 ? 'variável detectada' : 'variáveis detectadas'}`);
  T('deploy/deploy-instructions.md', 'comandos prontos para copiar');
  if (migCount > 0)
    T(`supabase/migrations/`,        `${migCount} ${migCount === 1 ? 'arquivo' : 'arquivos'} SQL`);
  if (fnCount > 0)
    T(`supabase/functions/`,         `${fnCount} ${fnCount === 1 ? 'Edge Function' : 'Edge Functions'}`);
  console.log('');

  H('Execução e planejamento');
  T('execution/execution-plan.json');
  T('execution/dry-run.md',          'preview sem executar nada');
  T('reports/migration-summary.json');
  console.log('');
}

function renderCta(ctx: ProjectContext): void {
  const blockers = ctx.validation?.summary.criticalCount ?? 0;
  const warnings = ctx.validation?.summary.warningCount ?? 0;

  console.log(BSEP);
  console.log('');

  if (blockers === 0) {
    console.log(`  ${chalk.green.bold('✓')}  ${chalk.bold('Análise concluída — nenhum bloqueador detectado.')}`);
  } else {
    console.log(`  ${chalk.cyan.bold('✓')}  ${chalk.bold('Análise concluída.')}`);
    const note = blockers === 1
      ? `1 issue crítico (env vars não configuradas — esperado em projetos novos)`
      : `${blockers} issues críticos`;
    console.log(`     ${chalk.gray(note)}`);
    if (warnings > 0)
      console.log(`     ${chalk.gray(`${warnings} ${warnings === 1 ? 'aviso' : 'avisos'} — revisar antes de produção`)}`);
  }

  console.log('');
  console.log(`  ${chalk.white.bold('Pronto para migrar seu projeto real?')}`);
  console.log('');
  console.log(`    ${chalk.cyan('lovable-migrate deploy')} ${chalk.gray('./meu-projeto')}`);
  console.log(`    ${chalk.cyan('lovable-migrate ui')}               ${chalk.gray('wizard interativo — recomendado')}`);
  console.log('');
  console.log(SEP);
  console.log(`  ${chalk.dim('Docs:')} ${chalk.gray('https://github.com/dynhosilva/migrator#readme')}`);
  console.log('');
}

export function runDemo(): void {
  renderBanner();

  setSilent(true);
  const ctx       = createContext(demoSource, 'demo', DEMO_NAME, DEMO_FILES);
  const analyzed  = analyzeContext(ctx);
  const planned   = planContext(analyzed);
  const validated = validateContext(planned);
  setSilent(false);

  new TerminalRenderer().render(validated);

  renderArtifacts(validated);
  renderCta(validated);
}
