import path  from 'path';
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

const W = 56;
const DIVIDER = chalk.gray('─'.repeat(W));

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
  console.log(chalk.bold.cyan(`  ┌${'─'.repeat(W - 2)}┐`));
  console.log(chalk.bold.cyan(`  │${'  Relatório de Análise'.padEnd(W - 2)}│`));
  console.log(chalk.bold.cyan(`  └${'─'.repeat(W - 2)}┘`));
  console.log('');

  row('Projeto',      chalk.white(report.projectName));
  row('Framework',    badge(report.framework));
  row('Linguagem',    `${badge(language.primary)}  ${chalk.gray(`${language.tsFileCount} ts · ${language.jsFileCount} js`)}`);
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
    row('Dev dependencies', chalk.white(String(devDeps.length)));

    if (scripts.length > 0) {
      console.log(`  ${chalk.gray('Scripts'.padEnd(18))}`);
      scripts.forEach(([name, cmd]) =>
        console.log(`    ${chalk.cyan(name.padEnd(14))} ${chalk.gray(cmd)}`)
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
    row('Migrations', chalk.white(`${supabase.migrations.count} arquivo(s)`));
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

  if (supabase.detected && supabase.clientFiles.length > 0) {
    row('Clientes', '');
    supabase.clientFiles.forEach((f) => console.log(`    ${chalk.gray(f)}`));
  }

  section('Variáveis de ambiente');
  if (report.envVars.length > 0) {
    report.envVars.forEach((v) => console.log(`  ${chalk.yellow(v)}`));
  } else {
    console.log(`  ${chalk.gray('Nenhuma detectada')}`);
  }

  if (report.routes.length > 0) {
    section('Rotas');
    report.routes.forEach((r) =>
      console.log(`  ${chalk.cyan(r.path.padEnd(30))} ${chalk.gray(r.file)}`)
    );
  }

  section('Arquivos críticos');
  if (report.criticalFiles.length > 0) {
    report.criticalFiles.forEach((f) => console.log(`  ${chalk.white(f)}`));
  } else {
    console.log(`  ${chalk.gray('Nenhum identificado')}`);
  }

  console.log('');
  console.log(chalk.gray(`  Analisado em: ${report.detectedAt}`));
  console.log('');
}

const RISK_COLORS: Record<RiskLevel, (s: string) => string> = {
  critical: (s) => chalk.red.bold(s),
  high:     (s) => chalk.red(s),
  medium:   (s) => chalk.yellow(s),
  low:      (s) => chalk.gray(s),
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
  section('Supabase — requisitos');
  console.log(tick(s.requiresOwnInstance,   'Instância própria'));
  console.log(tick(s.requiresMigrations,    'Migrations de banco de dados'));
  console.log(tick(s.requiresAuth,          'Autenticação'));
  console.log(tick(s.requiresStorage,       'Object Storage'));
  console.log(tick(s.requiresEdgeFunctions, 'Edge Functions'));
  console.log(tick(s.requiresRealtime,      'Realtime'));

  if (s.manualSteps.length > 0) {
    console.log('');
    console.log(`  ${chalk.gray('Passos manuais necessários:')}`);
    s.manualSteps.forEach((step, i) =>
      console.log(`    ${chalk.gray(`${i + 1}.`)} ${step}`)
    );
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
      console.log(`  ${colorFn(`[${r.level.toUpperCase()}]`)} ${r.message}`);
      if (r.suggestion) {
        console.log(`    ${chalk.gray('→')} ${chalk.gray(r.suggestion)}`);
      }
    });
  }

  if (plan.checklist.length > 0) {
    section('Checklist de migração');
    plan.checklist.forEach((item) => {
      const box      = chalk.gray('[ ]');
      const label    = item.required ? item.label : chalk.gray(item.label);
      const required = item.required ? '' : chalk.gray('  (opcional)');
      console.log(`  ${box} ${label}${required}`);
      if (item.notes) {
        console.log(`    ${chalk.gray(item.notes)}`);
      }
    });
  }

  if (plan.warnings.length > 0) {
    section('Avisos');
    plan.warnings.forEach((w) =>
      console.log(`  ${chalk.yellow('!')} ${chalk.yellow(w)}`)
    );
  }

  console.log('');
  console.log(chalk.gray(`  Planejado em: ${plan.plannedAt}`));
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
      console.log(`  ${chalk.green('✓')}  ${chalk.white(label)} ${chalk.gray(`(${files.length} arquivo(s))`)}`);
    } else {
      console.log(`  ${chalk.gray('–')}  ${chalk.gray(label)} ${chalk.gray('(nenhum)')}`);
    }
  }

  console.log('');
  row('Total gerado', chalk.white.bold(`${result.report.totalFilesGenerated} arquivo(s)`));

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
  console.log(chalk.gray(`  Migrado em: ${result.migratedAt}`));
  console.log(chalk.gray(`  Leia: ${path.join(result.outputDir, 'deploy', 'deploy-instructions.md')}`));
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
  console.log(`  ${colorFn(`[${label}]`)} ${chalk.gray(`(${issue.rule})`)} ${issue.message}`);
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
  console.log(headerColor(`  │${'  Relatório de Validação'.padEnd(W - 2)}│`));
  console.log(headerColor(`  └${'─'.repeat(W - 2)}┘`));
  console.log('');

  row('Regras executadas', chalk.white(String(result.summary.rulesExecuted)));

  if (result.safeToMigrate) {
    row('Status', chalk.green.bold('✓ SEGURO para migração'));
  } else {
    row('Status', chalk.red.bold(`✗ NÃO SEGURO — ${result.summary.criticalCount} issue(s) crítico(s)`));
  }

  if (result.blockingIssues.length > 0) {
    section('Issues Críticos (bloqueiam migração)');
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
    `  Resumo: ${result.summary.criticalCount} crítico(s) · ` +
    `${result.summary.warningCount} aviso(s) · ` +
    `${result.summary.infoCount} info(s)`,
  ));
  console.log(chalk.gray(`  Validado em: ${result.validatedAt}`));
  console.log('');
}

export class TerminalRenderer implements Renderer {
  render(ctx: ProjectContext): void {
    if (!ctx.analysis) {
      console.log(chalk.yellow('  Nenhuma análise disponível no contexto.'));
      return;
    }
    renderAnalysis(ctx.analysis);

    if (ctx.plan) {
      renderPlan(ctx.plan);
    }

    if (ctx.validation) {
      renderValidation(ctx.validation);
    }

    if (ctx.migration) {
      renderMigration(ctx.migration);
    }
  }
}
