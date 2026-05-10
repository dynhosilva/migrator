import chalk from 'chalk';
import type { Renderer } from './renderer';
import type { ProjectContext } from '../core/types';
import type { AnalysisReport } from '../analyzer/types';

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

export class TerminalRenderer implements Renderer {
  render(ctx: ProjectContext): void {
    if (!ctx.analysis) {
      console.log(chalk.yellow('  Nenhuma análise disponível no contexto.'));
      return;
    }
    renderAnalysis(ctx.analysis);
  }
}
