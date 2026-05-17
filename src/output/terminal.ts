import chalk from 'chalk';
import type { Renderer } from './renderer';
import type { ProjectContext } from '../core/types';
import type { AnalysisReport } from '../analyzer/types';
import type {
  MigrationPlan,
  CompatibilityResult,
  InfrastructureResult,
  SupabasePlanResult,
  DeployStrategyResult,
  RiskLevel,
} from '../planner/types';
import type { MigrationResult } from '../migrator/types';
import type { ValidationResult, ValidationIssue } from '../validator/types';
import type { DeployState } from '../deploy/types';
import type { ExecutionState, ExecutionIssue as ExecIssue } from '../executor/types';
import type { RuntimeState, RuntimeIssue as RtIssue } from '../runtime/types';
import type { RemoteState, RemoteIssue as RmIssue } from '../remote/types';
import type { CicdState } from '../cicd/types';
import type { GuideState } from '../guide/types';

const W = 56;
const DIVIDER = chalk.gray('─'.repeat(W));

function pl(n: number, singular: string, plural: string): string {
  return n === 1 ? singular : plural;
}

function badge(value: string): string {
  const map: Record<string, (s: string) => string> = {
    next:       (s) => chalk.white.bold(s),
    react:      (s) => chalk.cyan(s),
    vue:        (s) => chalk.green(s),
    svelte:     (s) => chalk.red(s),
    vite:       (s) => chalk.yellow(s),
    cra:        (s) => chalk.blue(s),
    webpack:    (s) => chalk.magenta(s),
    typescript: (s) => chalk.blue(s),
    javascript: (s) => chalk.yellow(s),
    npm:        (s) => chalk.red(s),
    yarn:       (s) => chalk.cyan(s),
    pnpm:       (s) => chalk.yellow(s),
    bun:        (s) => chalk.white(s),
    unknown:    (s) => chalk.gray(s),
  };
  return (map[value] ?? ((s: string) => s))(value);
}

function tick(on: boolean, label: string): string {
  return `  ${on ? chalk.green('✓') : chalk.gray('–')}  ${on ? label : chalk.gray(label)}`;
}

function section(title: string): void {
  console.log('');
  console.log(chalk.bold(`  ${title}`));
  console.log('  ' + DIVIDER);
}

function row(label: string, value: string): void {
  console.log(`  ${chalk.gray(label.padEnd(18))} ${value}`);
}

function renderAnalysis(report: AnalysisReport): void {
  const { language, supabase, tailwind, packageJson, lovable } = report;

  console.log('');
  console.log(chalk.dim(`  → O projeto original não será modificado — todos os artefatos vão para --output`));
  console.log('');
  console.log(chalk.bold.cyan(`  ┌${'─'.repeat(W - 2)}┐`));
  console.log(chalk.bold.cyan(`  │${'  Relatório de Análise'.padEnd(W - 2)}│`));
  console.log(chalk.bold.cyan(`  └${'─'.repeat(W - 2)}┘`));
  console.log('');

  row('Projeto',      chalk.white(report.projectName));
  row('Framework',    badge(report.framework));
  const jsLabel = language.jsFileCount > 0 ? ` · ${language.jsFileCount} js` : '';
  row('Linguagem',    `${badge(language.primary)}  ${chalk.gray(`(${language.tsFileCount} ts${jsLabel})`)}`);
  row('Build system', badge(report.buildSystem));
  row('Package mgr',  badge(report.packageManager));

  if (lovable.detected) {
    row('Lovable', chalk.green(`✓  ${chalk.gray(lovable.configFile ?? '.lovable')}`));
  }

  if (packageJson) {
    const deps    = Object.keys(packageJson.dependencies ?? {});
    const devDeps = Object.keys(packageJson.devDependencies ?? {});
    const scripts = Object.entries(packageJson.scripts ?? {});

    section('package.json');
    row('Dependências',     chalk.white(String(deps.length)));
    row('Dev deps',         chalk.white(String(devDeps.length)));

    if (scripts.length > 0) {
      row('Scripts', chalk.gray(`(${scripts.length})`));
      const trunc = (s: string) => s.length > 32 ? s.slice(0, 31) + '…' : s;
      scripts.forEach(([name, cmd]) =>
        console.log(`    ${chalk.cyan(name.padEnd(14))} ${chalk.gray(trunc(cmd))}`)
      );
    }
  }

  section('Tailwind CSS');
  console.log(tick(tailwind.detected, 'Tailwind CSS'));
  if (tailwind.detected) {
    console.log(tick(tailwind.hasShadcn, 'shadcn/ui'));
    console.log(tick(tailwind.hasRadix,  'Radix UI'));
  }

  section('Supabase');
  console.log(tick(supabase.detected, 'Detectado'));

  if (supabase.detected) {
    console.log(tick(supabase.usesAuth,     'Auth'));
    console.log(tick(supabase.usesStorage,  'Storage'));
    console.log(tick(supabase.usesRealtime, 'Realtime'));
  }

  if (supabase.migrations.count > 0) {
    const mc = supabase.migrations.count;
    row('Migrations', chalk.white(`${mc} ${pl(mc, 'arquivo', 'arquivos')}`));
    supabase.migrations.files.forEach((f) =>
      console.log(`    ${chalk.gray(f.split('/').pop() ?? f)}`)
    );
  }

  if (supabase.edgeFunctions.count > 0) {
    row('Edge Functions', chalk.white(`${supabase.edgeFunctions.count}`));
    supabase.edgeFunctions.names.forEach((name) =>
      console.log(`    ${chalk.cyan(name)}`)
    );
  }

  section('Variáveis de ambiente');
  if (report.envVars.length > 0) {
    report.envVars.forEach((v) => console.log(`  ${chalk.yellow(v)}`));
  } else {
    console.log(`  ${chalk.gray('Nenhuma detectada')}`);
  }

  if (report.routes.length > 0) {
    section('Rotas');
    const paths = report.routes.map((r) => r.path);
    for (let i = 0; i < paths.length; i += 3) {
      const group = paths.slice(i, i + 3).map((p) => chalk.cyan(p)).join(chalk.gray('  ·  '));
      console.log(`  ${group}`);
    }
  }

  section('Arquivos críticos');
  if (report.criticalFiles.length > 0) {
    report.criticalFiles.forEach((f) => console.log(`  ${chalk.white(f)}`));
  } else {
    console.log(`  ${chalk.gray('Nenhum identificado')}`);
  }

  console.log('');
}

function renderNextSteps(report: AnalysisReport): void {
  console.log('');
  console.log(chalk.bold(`  ┌${'─'.repeat(W - 2)}┐`));
  console.log(chalk.bold(`  │${'  Próximos passos recomendados'.padEnd(W - 2)}│`));
  console.log(chalk.bold(`  └${'─'.repeat(W - 2)}┘`));
  console.log('');

  const steps: Array<{ label: string; cmd: string }> = [];

  steps.push({
    label: 'Gerar Dockerfile, GitHub Actions e plano de migração completo',
    cmd: `lovable-migrate deploy ./${report.projectName} --output ./output`,
  });

  if (report.envVars.length > 0) {
    steps.push({
      label: `Configurar ${report.envVars.length} variável${report.envVars.length > 1 ? 'is' : ''} de ambiente no servidor destino`,
      cmd: `# Template gerado em output/${report.projectName}/env/.env.example`,
    });
  }

  if (report.supabase.detected) {
    steps.push({
      label: 'Provisionar instância Supabase e aplicar migrations',
      cmd: `# Arquivos gerados em output/${report.projectName}/supabase/`,
    });
  }

  steps.push({
    label: 'Usar o wizard interativo (recomendado para primeiro uso)',
    cmd: 'lovable-migrate ui',
  });

  steps.slice(0, 4).forEach((step, i) => {
    console.log(`  ${chalk.cyan(String(i + 1) + '.')} ${chalk.white(step.label)}`);
    console.log(`     ${chalk.dim(step.cmd)}`);
    console.log('');
  });
}

const RISK_COLORS: Record<RiskLevel, (s: string) => string> = {
  critical: (s) => chalk.red.bold(s),
  high:     (s) => chalk.red(s),
  medium:   (s) => chalk.yellow(s),
  low:      (s) => chalk.gray(s),
};

const RISK_LABEL: Record<RiskLevel, string> = {
  critical: 'CRÍTICO',
  high:     'ALTO',
  medium:   'MÉDIO',
  low:      'BAIXO',
};

const CONFIDENCE_LABEL: Record<string, string> = {
  high:    'alta',
  medium:  'média',
  low:     'baixa',
  unknown: 'indeterminada',
};

const DEPLOY_LABEL: Record<string, string> = {
  'static':      'estático (CDN / hosting simples)',
  'node-server': 'servidor Node.js',
  'docker':      'Docker',
  'edge':        'edge (Cloudflare Workers / Deno Deploy)',
  'unknown':     'indeterminado',
};

function renderCompatibility(c: CompatibilityResult): void {
  section('Compatibilidade de deploy');
  console.log(tick(c.canDeployStatic, 'Deploy estático (CDN / hosting simples)'));
  console.log(tick(c.canDeployServer, 'Deploy server-side (Node.js / Docker)'));
  row('Confiança', chalk.white(CONFIDENCE_LABEL[c.confidence] ?? c.confidence));
  if (c.reasons.length > 0) {
    c.reasons.forEach((r) => console.log(`    ${chalk.gray('·')} ${chalk.gray(r)}`));
  }
}

function renderInfrastructure(inf: InfrastructureResult): void {
  section('Infraestrutura necessária');
  console.log(tick(inf.requiresSupabase,       'Instância própria do Supabase'));
  console.log(tick(inf.requiresDatabase,       'Banco de dados (migrations)'));
  console.log(tick(inf.requiresObjectStorage,  'Object Storage (Supabase Storage)'));
  console.log(tick(inf.requiresServerlessEdge, 'Edge Functions serverless'));
  console.log(tick(inf.requiresNodeServer,     'Servidor Node.js'));
  if (inf.notes.length > 0) {
    console.log('');
    inf.notes.forEach((n) => console.log(`    ${chalk.gray('·')} ${chalk.gray(n)}`));
  }
}

function renderSupabasePlan(s: SupabasePlanResult): void {
  if (!s.requiresOwnInstance) return;
  section('Supabase');
  console.log(tick(s.requiresOwnInstance,   'Instância própria'));
  console.log(tick(s.requiresMigrations,    'Migrations de banco de dados'));
  console.log(tick(s.requiresAuth,          'Autenticação'));
  console.log(tick(s.requiresStorage,       'Object Storage'));
  console.log(tick(s.requiresEdgeFunctions, 'Edge Functions'));
  console.log(tick(s.requiresRealtime,      'Realtime'));

  if (s.manualSteps.length > 0) {
    const MAX_STEPS = 5;
    console.log('');
    console.log(`  ${chalk.gray('Próximos passos:')}`);
    s.manualSteps.slice(0, MAX_STEPS).forEach((step, i) =>
      console.log(`    ${chalk.gray(`${i + 1}.`)} ${step}`)
    );
    if (s.manualSteps.length > MAX_STEPS) {
      const rem = s.manualSteps.length - MAX_STEPS;
      console.log(`    ${chalk.dim(`… e mais ${rem} ${pl(rem, 'passo', 'passos')} em deploy-instructions.md`)}`);
    }
  }
}

function renderDeployStrategy(d: DeployStrategyResult): void {
  section('Estratégia de deploy');
  const recLabel = DEPLOY_LABEL[d.recommended] ?? d.recommended;
  row('Recomendado',  chalk.white.bold(recLabel));
  row('Confiança',    chalk.white(CONFIDENCE_LABEL[d.confidence] ?? d.confidence));
  console.log('');
  console.log(`    ${chalk.italic(d.reasoning)}`);
  if (d.alternatives.length > 0) {
    const alts = d.alternatives.map((a) => DEPLOY_LABEL[a] ?? a).join(', ');
    console.log('');
    row('Alternativas', chalk.gray(alts));
  }
  if (d.notes.length > 0) {
    console.log('');
    d.notes.forEach((n) => console.log(`    ${chalk.gray('·')} ${chalk.gray(n)}`));
  }
}

function renderPlan(plan: MigrationPlan): void {
  const W = 56;
  console.log('');
  console.log(chalk.bold.magenta(`  ┌${'─'.repeat(W - 2)}┐`));
  console.log(chalk.bold.magenta(`  │${'  Plano de Migração'.padEnd(W - 2)}│`));
  console.log(chalk.bold.magenta(`  └${'─'.repeat(W - 2)}┘`));
  console.log('');

  row('Projeto',      chalk.white(plan.projectName));

  renderDeployStrategy(plan.deployStrategy);
  renderCompatibility(plan.compatibility);
  renderInfrastructure(plan.infrastructure);

  if (plan.supabase.requiresOwnInstance) {
    renderSupabasePlan(plan.supabase);
  }

  if (plan.env.required.length > 0) {
    section('Variáveis de ambiente');
    row('Obrigatórias', chalk.white(String(plan.env.required.length)));
    plan.env.required.forEach((v) => console.log(`    ${chalk.yellow(v)}`));
  }

  if (plan.risks.length > 0) {
    section('Riscos detectados');
    const order: RiskLevel[] = ['critical', 'high', 'medium', 'low'];
    const sorted = [...plan.risks].sort(
      (a, b) => order.indexOf(a.level) - order.indexOf(b.level),
    );
    sorted.forEach((r) => {
      const colorFn = RISK_COLORS[r.level];
      console.log(`  ${colorFn(`[${RISK_LABEL[r.level]}]`)} ${r.message}`);
      if (r.suggestion) {
        console.log(`    ${chalk.gray('→')} ${chalk.gray(r.suggestion)}`);
      }
    });
  }

  if (plan.checklist.length > 0) {
    const MAX_ITEMS = 8;
    section('Checklist de migração');
    plan.checklist.slice(0, MAX_ITEMS).forEach((item) => {
      const box      = chalk.gray('[ ]');
      const label    = item.required ? item.label : chalk.gray(item.label);
      const optional = item.required ? '' : chalk.gray('  opcional');
      console.log(`  ${box} ${label}${optional}`);
      if (item.notes) {
        console.log(`    ${chalk.gray(item.notes)}`);
      }
    });
    if (plan.checklist.length > MAX_ITEMS) {
      const rem = plan.checklist.length - MAX_ITEMS;
      console.log('');
      console.log(`  ${chalk.dim(`… e mais ${rem} ${pl(rem, 'passo', 'passos')} em deploy-instructions.md`)}`);
    }
  }

  if (plan.warnings.length > 0) {
    section('Avisos');
    plan.warnings.forEach((w) =>
      console.log(`  ${chalk.yellow('!')} ${chalk.yellow(w)}`)
    );
  }

  console.log('');
}

function renderMigration(result: MigrationResult): void {
  const W = 56;
  console.log('');
  console.log(chalk.bold.green(`  ┌${'─'.repeat(W - 2)}┐`));
  console.log(chalk.bold.green(`  │${'  Resultado da Migração'.padEnd(W - 2)}│`));
  console.log(chalk.bold.green(`  └${'─'.repeat(W - 2)}┘`));
  console.log('');

  row('Projeto', chalk.white(result.projectName));
  row('Saída',   chalk.white(result.outputDir));

  section('Artefatos gerados');

  const categories: Array<{ label: string; files: { length: number } }> = [
    { label: 'Variáveis de ambiente',    files: result.env.files },
    { label: 'Migrations SQL',           files: result.migrations.files },
    { label: 'Edge Functions',           files: result.edgeFunctions.files },
    { label: 'Instruções de deploy',     files: result.deployInstructions.files },
    { label: 'READMEs das pastas',       files: result.folderReadmes.files },
    { label: 'Relatório de migração',    files: result.report.files },
  ];

  for (const { label, files } of categories) {
    if (files.length > 0) {
      console.log(`  ${chalk.green('✓')}  ${chalk.white(label)} ${chalk.gray(`(${files.length} ${pl(files.length, 'arquivo', 'arquivos')})`)}`);
    } else {
      console.log(`  ${chalk.gray('–')}  ${chalk.gray(label)} ${chalk.gray('(nenhum)')}`);
    }
  }

  console.log('');
  const tf = result.report.totalFilesGenerated;
  row('Total gerado', chalk.white.bold(`${tf} ${pl(tf, 'arquivo', 'arquivos')}`));

  if (result.report.pendingManualSteps.length > 0) {
    section('Passos manuais pendentes');
    result.report.pendingManualSteps.forEach((step, i) =>
      console.log(`  ${chalk.yellow(String(i + 1) + '.')} ${step}`)
    );
  }

  if (result.report.warnings.length > 0) {
    section('Avisos');
    result.report.warnings.forEach((w) =>
      console.log(`  ${chalk.yellow('!')} ${chalk.yellow(w)}`)
    );
  }

  console.log('');
  console.log(chalk.dim(`  → ${result.outputDir}/`));
  console.log('');
}

const SEVERITY_COLOR: Record<string, (s: string) => string> = {
  critical: (s) => chalk.red.bold(s),
  warning:  (s) => chalk.yellow(s),
  info:     (s) => chalk.blue(s),
};

const SEVERITY_LABEL: Record<string, string> = {
  critical: 'CRÍTICO',
  warning:  'AVISO',
  info:     'INFO',
};

function renderIssue(issue: ValidationIssue): void {
  const colorFn = SEVERITY_COLOR[issue.severity] ?? ((s: string) => s);
  const label   = SEVERITY_LABEL[issue.severity] ?? issue.severity.toUpperCase();
  console.log(`  ${colorFn(`[${label}]`)} ${issue.message}`);
  if (issue.suggestion) {
    console.log(`    ${chalk.gray('→')} ${chalk.gray(issue.suggestion)}`);
  }
}

function renderValidation(result: ValidationResult): void {
  const W = 56;
  const hasCritical = result.blockingIssues.length > 0;
  const headerColor = hasCritical ? chalk.bold.red : chalk.bold.green;

  console.log('');
  console.log(headerColor(`  ┌${'─'.repeat(W - 2)}┐`));
  console.log(headerColor(`  │${'  Validação'.padEnd(W - 2)}│`));
  console.log(headerColor(`  └${'─'.repeat(W - 2)}┘`));
  console.log('');

  const nc = result.summary.criticalCount;
  const nw = result.summary.warningCount;
  const ni = result.summary.infoCount;

  if (result.safeToMigrate) {
    row('Status', chalk.green.bold('✓ Pronto para migração'));
  } else {
    row('Status', chalk.red.bold(`✗ ${nc} ${pl(nc, 'bloqueador', 'bloqueadores')} — configure antes de migrar`));
    row('Dica',   chalk.dim('Use --force no deploy para prosseguir mesmo assim'));
  }

  if (result.blockingIssues.length > 0) {
    section('Bloqueadores');
    result.blockingIssues.forEach(renderIssue);
  }

  if (result.warnings.length > 0) {
    section('Avisos');
    result.warnings.forEach(renderIssue);
  }

  if (result.infos.length > 0) {
    section('Informações');
    result.infos.forEach(renderIssue);
  }

  if (result.issues.length === 0) {
    console.log('');
    console.log(`  ${chalk.green('✓')}  ${chalk.green('Nenhum problema detectado — projeto pronto para migração.')}`);
  }

  console.log('');
  console.log(chalk.gray(
    `  Resumo: ${nc} ${pl(nc, 'crítico', 'críticos')} · ` +
    `${nw} ${pl(nw, 'aviso', 'avisos')} · ` +
    `${ni} ${pl(ni, 'informação', 'informações')}`,
  ));
  console.log('');
}

function renderDeploy(state: DeployState): void {
  const W = 56;
  console.log('');
  console.log(chalk.bold.blue(`  ┌${'─'.repeat(W - 2)}┐`));
  console.log(chalk.bold.blue(`  │${'  Artefatos Docker'.padEnd(W - 2)}│`));
  console.log(chalk.bold.blue(`  └${'─'.repeat(W - 2)}┘`));
  console.log('');

  row('Projeto',    chalk.white(state.projectName));
  row('Estratégia', chalk.white(state.docker.strategy));
  row('Imagem base', chalk.white(state.docker.baseImage));
  row('Porta',      chalk.white(String(state.docker.exposedPort)));

  section('Arquivos gerados');
  for (const f of state.docker.files) {
    console.log(`  ${chalk.blue('✓')}  ${chalk.white(f.relativePath)} ${chalk.gray(`— ${f.description}`)}`);
  }
  for (const f of state.report.files) {
    console.log(`  ${chalk.blue('✓')}  ${chalk.white(f.relativePath)} ${chalk.gray(`— ${f.description}`)}`);
  }

  console.log('');
  const td = state.report.totalFilesGenerated;
  row('Total', chalk.white.bold(`${td} ${pl(td, 'arquivo', 'arquivos')}`));

  if (state.report.notes.length > 0) {
    section('Observações');
    state.report.notes.forEach((n) =>
      console.log(`  ${chalk.yellow('!')} ${chalk.yellow(n)}`)
    );
  }

  console.log('');
  console.log(chalk.dim(`  → ${state.outputDir}/`));
  console.log(chalk.dim(`    Copie docker/ para a raiz do projeto e execute docker compose up`));
  console.log('');
}

const READINESS_COLOR: Record<string, (s: string) => string> = {
  'ready':               (s) => chalk.green.bold(s),
  'ready-with-warnings': (s) => chalk.yellow.bold(s),
  'blocked':             (s) => chalk.red.bold(s),
};

const READINESS_LABEL: Record<string, string> = {
  'ready':               '✓ PRONTO para execução',
  'ready-with-warnings': '⚠ PRONTO com avisos',
  'blocked':             '✗ BLOQUEADO',
};

function renderExecIssue(issue: ExecIssue): void {
  const colorFn = issue.severity === 'blocker' ? chalk.red.bold
    : issue.severity === 'warning' ? chalk.yellow
    : chalk.blue;
  const label = issue.severity === 'blocker' ? 'BLOQUEADOR'
    : issue.severity === 'warning' ? 'AVISO'
    : 'INFO';
  console.log(`  ${colorFn(`[${label}]`)} ${issue.message}`);
  if (issue.suggestion) {
    console.log(`    ${chalk.gray('→')} ${chalk.gray(issue.suggestion)}`);
  }
}

function renderExecution(state: ExecutionState): void {
  const W = 56;
  const readiness = state.summary.readiness;
  const headerColor = readiness === 'ready' ? chalk.bold.green
    : readiness === 'ready-with-warnings' ? chalk.bold.yellow
    : chalk.bold.red;

  console.log('');
  console.log(headerColor(`  ┌${'─'.repeat(W - 2)}┐`));
  console.log(headerColor(`  │${'  Checklist de deploy'.padEnd(W - 2)}│`));
  console.log(headerColor(`  └${'─'.repeat(W - 2)}┘`));
  console.log('');

  row('Projeto',   chalk.white(state.projectName));
  const colorFn = READINESS_COLOR[readiness] ?? ((s: string) => s);
  row('Prontidão', colorFn(READINESS_LABEL[readiness] ?? readiness));

  section('Ambiente');
  const env = state.envCheck;
  console.log(tick(env.nodeAvailable,           `Node.js ${env.nodeVersion ?? ''}`));
  console.log(tick(env.dockerAvailable,         `Docker ${env.dockerVersion ?? ''}`));
  console.log(tick(env.packageManagerAvailable, `${state.buildCheck.packageManager} ${env.packageManagerVersion ?? ''}`));

  section('Artefatos Docker');
  console.log(tick(state.dockerCheck.valid, 'Todos os arquivos Docker presentes'));
  if (state.dockerCheck.missingFiles.length > 0) {
    state.dockerCheck.missingFiles.forEach((f) =>
      console.log(`    ${chalk.red('✗')}  ${chalk.gray(f)}`)
    );
  }

  section('Build');
  console.log(tick(state.buildCheck.hasBuildScript, `Script build: ${state.buildCheck.buildCommand ?? '—'}`));
  console.log(tick(state.buildCheck.hasDevScript,   `Script dev:   ${state.buildCheck.devCommand ?? '—'}`));

  if (state.plan.steps.length > 0) {
    section('Plano de execução');
    state.plan.steps.forEach((step, i) => {
      console.log(`  ${chalk.gray(String(i + 1) + '.')} ${chalk.white(step.description)}`);
      console.log(`     ${chalk.cyan(step.command)}`);
    });
  }

  if (state.summary.blockers.length > 0) {
    section('Bloqueadores');
    state.summary.blockers.forEach(renderExecIssue);
  }

  if (state.summary.warnings.length > 0) {
    section('Avisos');
    state.summary.warnings.forEach(renderExecIssue);
  }

  console.log('');
  console.log(chalk.dim(`  → ${state.outputDir}/execution/`));
  console.log('');
}

const RUNTIME_READINESS_COLOR: Record<string, (s: string) => string> = {
  success: (s) => chalk.green.bold(s),
  partial: (s) => chalk.yellow.bold(s),
  failed:  (s) => chalk.red.bold(s),
};

const RUNTIME_READINESS_LABEL: Record<string, string> = {
  success: '✓ SUCESSO',
  partial: '⚠ PARCIAL',
  failed:  '✗ FALHOU',
};

function renderRtIssue(issue: RtIssue): void {
  const colorFn = issue.severity === 'blocker' ? chalk.red.bold
    : issue.severity === 'warning' ? chalk.yellow
    : chalk.blue;
  const label = issue.severity === 'blocker' ? 'BLOQUEADOR'
    : issue.severity === 'warning' ? 'AVISO'
    : 'INFO';
  console.log(`  ${colorFn(`[${label}]`)} ${issue.message}`);
  if (issue.suggestion) {
    console.log(`    ${chalk.gray('→')} ${chalk.gray(issue.suggestion)}`);
  }
}

function renderRuntime(state: RuntimeState): void {
  const W = 56;
  const readiness = state.readiness;
  const headerColor = readiness === 'success' ? chalk.bold.green
    : readiness === 'partial' ? chalk.bold.yellow
    : chalk.bold.red;

  console.log('');
  console.log(headerColor(`  ┌${'─'.repeat(W - 2)}┐`));
  console.log(headerColor(`  │${'  Runtime — Execução Local'.padEnd(W - 2)}│`));
  console.log(headerColor(`  └${'─'.repeat(W - 2)}┘`));
  console.log('');

  row('Projeto',    chalk.white(state.projectName));
  const colorFn = RUNTIME_READINESS_COLOR[readiness] ?? ((s: string) => s);
  row('Prontidão', colorFn(RUNTIME_READINESS_LABEL[readiness] ?? readiness));

  section('Execução');
  const { install, build, dockerBuild } = state;
  const fmt = (r: { success: boolean; skipped: boolean }) =>
    r.skipped ? chalk.gray('⏭ pulado') : r.success ? chalk.green('✓ sucesso') : chalk.red('✗ falhou');

  console.log(`  ${chalk.gray('npm install'.padEnd(18))} ${fmt(install)}`);
  console.log(`  ${chalk.gray('build'.padEnd(18))} ${fmt(build)}`);
  console.log(`  ${chalk.gray('docker build'.padEnd(18))} ${fmt(dockerBuild)}`);

  if (!dockerBuild.skipped) {
    console.log('');
    row('Imagem', chalk.white(`${dockerBuild.imageTag}:latest`));
  }

  const allBlockers: RtIssue[] = [
    ...(install.issues.filter((i) => i.severity === 'blocker')),
    ...(build.issues.filter((i) => i.severity === 'blocker')),
    ...(dockerBuild.issues.filter((i) => i.severity === 'blocker')),
    ...(state.artifacts.issues.filter((i) => i.severity === 'blocker')),
  ];
  const allWarnings: RtIssue[] = [
    ...(install.issues.filter((i) => i.severity === 'warning')),
    ...(build.issues.filter((i) => i.severity === 'warning')),
    ...(dockerBuild.issues.filter((i) => i.severity === 'warning')),
    ...(state.artifacts.issues.filter((i) => i.severity === 'warning')),
  ];

  if (allBlockers.length > 0) {
    section('Bloqueadores');
    allBlockers.forEach(renderRtIssue);
  }

  if (allWarnings.length > 0) {
    section('Avisos');
    allWarnings.forEach(renderRtIssue);
  }

  console.log('');
  console.log(chalk.dim(`  → ${state.outputDir}/runtime/`));
  console.log('');
}

function renderCicd(state: CicdState): void {
  const allFiles = [...state.ci.files, ...state.release.files];
  if (allFiles.length === 0) return;

  console.log('');
  console.log(chalk.bold.green(`  ┌${'─'.repeat(W - 2)}┐`));
  console.log(chalk.bold.green(`  │${'  GitHub Actions'.padEnd(W - 2)}│`));
  console.log(chalk.bold.green(`  └${'─'.repeat(W - 2)}┘`));
  console.log('');

  section('Workflows gerados');
  for (const f of state.ci.files) {
    console.log(`  ${chalk.green('✓')}  ${chalk.white(f.relativePath)}`);
    console.log(`     ${chalk.gray('push + pull_request em main — Node matrix [20, 22] — npm cache')}`);
  }
  for (const f of state.release.files) {
    console.log(`  ${chalk.green('✓')}  ${chalk.white(f.relativePath)}`);
    console.log(`     ${chalk.gray('push de tag v* — npm publish --dry-run por padrão')}`);
  }

  console.log('');
  console.log(chalk.dim(`  → git add .github/ && git push — ativa o CI automaticamente`));
  console.log('');
}

const REMOTE_READINESS_COLOR: Record<string, (s: string) => string> = {
  'ready':               (s) => chalk.green.bold(s),
  'ready-with-warnings': (s) => chalk.yellow.bold(s),
  'blocked':             (s) => chalk.red.bold(s),
};

const REMOTE_READINESS_LABEL: Record<string, string> = {
  'ready':               '✓ PRONTO para deploy',
  'ready-with-warnings': '⚠ PRONTO com avisos',
  'blocked':             '✗ BLOQUEADO',
};

function renderRmIssue(issue: RmIssue): void {
  const colorFn = issue.severity === 'blocker' ? chalk.red.bold
    : issue.severity === 'warning' ? chalk.yellow
    : chalk.blue;
  const label = issue.severity === 'blocker' ? 'BLOQUEADOR'
    : issue.severity === 'warning' ? 'AVISO'
    : 'INFO';
  console.log(`  ${colorFn(`[${label}]`)} ${issue.message}`);
  if (issue.suggestion) {
    console.log(`    ${chalk.gray('→')} ${chalk.gray(issue.suggestion)}`);
  }
}

function renderRemote(state: RemoteState): void {
  const W = 56;
  const readiness = state.readiness;
  const headerColor = readiness === 'ready' ? chalk.bold.green
    : readiness === 'ready-with-warnings' ? chalk.bold.yellow
    : chalk.bold.red;

  console.log('');
  console.log(headerColor(`  ┌${'─'.repeat(W - 2)}┐`));
  console.log(headerColor(`  │${'  Deploy Remoto'.padEnd(W - 2)}│`));
  console.log(headerColor(`  └${'─'.repeat(W - 2)}┘`));
  console.log('');

  row('Projeto',   chalk.white(state.projectName));
  const colorFn = REMOTE_READINESS_COLOR[readiness] ?? ((s: string) => s);
  row('Prontidão', colorFn(REMOTE_READINESS_LABEL[readiness] ?? readiness));

  section('Servidor remoto');
  row('Host',         chalk.white(`${state.sshCheck.config.host}:${state.sshCheck.config.port}`));
  row('Usuário',      chalk.white(state.sshCheck.config.user));
  row('Caminho',      chalk.white(state.remotePath));
  row('OS do host',   chalk.white(`${state.hostCheck.profile.os} ${state.hostCheck.profile.osVersion}`));
  row('Docker',       state.hostCheck.profile.dockerAvailable ? chalk.green('disponível') : chalk.red('não disponível'));
  row('Disco',        chalk.white(`${state.hostCheck.profile.diskSpaceGB}GB`));

  section('Compatibilidade');
  console.log(tick(state.hostCheck.compatible,       'Host compatível'));
  console.log(tick(state.sshCheck.valid,             'Configuração SSH válida'));
  console.log(tick(state.deploymentCheck.compatible, `Estratégia: ${state.deploymentCheck.strategy}`));

  section('Transferência');
  row('Arquivos',  chalk.white(String(state.transferPlan.files.length)));
  row('Tamanho',   chalk.white(`~${state.transferPlan.totalEstimatedSizeKB}KB`));

  if (state.executionPlan.steps.length > 0) {
    section('Plano de execução');
    state.executionPlan.steps.forEach((step, i) => {
      const loc = step.remote ? chalk.blue('[remoto]') : chalk.cyan('[local]');
      console.log(`  ${chalk.gray(String(i + 1) + '.')} ${loc} ${chalk.white(step.description)}`);
    });
  }

  const allBlockers: RmIssue[] = [
    ...(state.hostCheck.issues.filter((i) => i.severity === 'blocker')),
    ...(state.sshCheck.issues.filter((i) => i.severity === 'blocker')),
    ...(state.transferPlan.issues.filter((i) => i.severity === 'blocker')),
    ...(state.deploymentCheck.issues.filter((i) => i.severity === 'blocker')),
  ];
  const allWarnings: RmIssue[] = [
    ...(state.hostCheck.issues.filter((i) => i.severity === 'warning')),
    ...(state.sshCheck.issues.filter((i) => i.severity === 'warning')),
    ...(state.transferPlan.issues.filter((i) => i.severity === 'warning')),
    ...(state.deploymentCheck.issues.filter((i) => i.severity === 'warning')),
  ];

  if (allBlockers.length > 0) {
    section('Bloqueadores');
    allBlockers.forEach(renderRmIssue);
  }

  if (allWarnings.length > 0) {
    section('Avisos');
    allWarnings.forEach(renderRmIssue);
  }

  console.log('');
  console.log(chalk.dim(`  → ${state.outputDir}/remote/`));
  console.log('');
}

function renderGuide(state: GuideState): void {
  console.log('');
  console.log(chalk.bold.magenta(`  ┌${'─'.repeat(W - 2)}┐`));
  console.log(chalk.bold.magenta(`  │${'  Deploy Assistido — Pacote Humano'.padEnd(W - 2)}│`));
  console.log(chalk.bold.magenta(`  └${'─'.repeat(W - 2)}┘`));
  console.log('');

  row('Projeto',  chalk.white(state.projectName));
  row('Target',   chalk.white(state.target));
  row('Domínio',  state.domain ? chalk.white(state.domain) : chalk.gray('(não configurado)'));
  row('Porta',    chalk.white(String(state.port)));
  row('Caminho',  chalk.white(state.remotePath));
  row('Nível',    chalk.white(state.difficultyLevel));
  row('Tempo',    chalk.white(`~${state.estimatedTotalMinutes} min`));
  row('Checklist', chalk.white(`${state.checklist.totalItems} itens (${state.checklist.requiredItems} obrigatórios)`));

  section('Artefatos gerados');
  for (const f of state.deployDoc.files) {
    console.log(`  ${chalk.green('✓')}  ${chalk.white(f.relativePath)}`);
    console.log(`     ${chalk.gray(f.description)}`);
  }
  for (const f of state.checklist.files) {
    console.log(`  ${chalk.green('✓')}  ${chalk.white(f.relativePath)}`);
    console.log(`     ${chalk.gray(f.description)}`);
  }
  for (const s of state.scripts.scripts) {
    const where = s.executionLocation === 'local'
      ? chalk.cyan('[local]')
      : chalk.blue('[remoto]');
    console.log(`  ${chalk.green('✓')}  ${chalk.white(s.relativePath)} ${where}`);
    console.log(`     ${chalk.gray(s.purpose)}`);
  }

  console.log('');
  console.log(chalk.dim(`  → Abra ${state.outputDir}/deployment-guide/DEPLOY.md para entender o processo`));
  console.log(chalk.dim(`  → Abra ${state.outputDir}/deployment-guide/CHECKLIST.md para acompanhar o progresso`));
  console.log(chalk.dim(`  → Antes de usar os scripts: ${state.scripts.chmodCommand}`));
  console.log('');
}

export class TerminalRenderer implements Renderer {
  render(ctx: ProjectContext): void {
    if (!ctx.analysis) {
      console.log(chalk.yellow('  Nenhuma análise disponível no contexto.'));
      return;
    }
    renderAnalysis(ctx.analysis);

    if (!ctx.plan) {
      renderNextSteps(ctx.analysis);
    }

    if (ctx.plan) {
      renderPlan(ctx.plan);
    }

    if (ctx.validation) {
      renderValidation(ctx.validation);
    }

    if (ctx.migration) {
      renderMigration(ctx.migration);
    }

    if (ctx.deploy) {
      renderDeploy(ctx.deploy);
    }

    if (ctx.cicd) {
      renderCicd(ctx.cicd);
    }

    if (ctx.execution) {
      renderExecution(ctx.execution);
    }

    if (ctx.runtime) {
      renderRuntime(ctx.runtime);
    }

    if (ctx.remote) {
      renderRemote(ctx.remote);
    }

    if (ctx.guide) {
      renderGuide(ctx.guide);
    }
  }
}
