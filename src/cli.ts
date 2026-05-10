#!/usr/bin/env node
import path from 'path';
import { Command } from 'commander';
import { resolveSource }   from './sources';
import { analyzeContext }  from './analyzer';
import { planContext }     from './planner';
import { validateContext } from './validator';
import { migrateContext }  from './migrator';
import { createContext }   from './core';
import { TerminalRenderer, JsonRenderer } from './output';
import { logger, setVerbose } from './logger';

const program = new Command();

program
  .name('lovable-migrate')
  .description('Migration engine for Lovable.dev exported projects')
  .version('0.1.0');

program
  .command('inspect <input>')
  .description('Lista os arquivos de uma fonte (pasta, ZIP ou repositório clonado)')
  .option('-v, --verbose', 'Habilita saída verbose')
  .action(async (input: string, options: { verbose?: boolean }) => {
    if (options.verbose) setVerbose(true);

    try {
      const source = resolveSource(input);
      logger.info(`Fonte  : ${source.describe()}`);

      const files = await source.load();

      console.log('');
      logger.info(`Kind   : ${source.kind}`);
      logger.info(`Files  : ${files.length}`);

      if (options.verbose) {
        console.log('');
        files.forEach((f) => logger.debug(`  ${f.relativePath} (${f.size}b)`));
      }
    } catch (err) {
      logger.error((err as Error).message);
      process.exit(1);
    }
  });

program
  .command('analyze <input>')
  .description('Analisa um projeto e exibe relatório detalhado')
  .option('-v, --verbose', 'Habilita saída verbose')
  .option('-f, --format <format>', 'Formato de saída: terminal | json', 'terminal')
  .action(async (input: string, options: { verbose?: boolean; format?: string }) => {
    if (options.verbose) setVerbose(true);

    try {
      const source      = resolveSource(input);
      const files       = await source.load();
      const projectName = path.basename(input).replace(/\.zip$/i, '');

      logger.info(`Fonte: ${source.describe()}`);

      // Pipeline: fonte → contexto → análise → renderização
      const ctx      = createContext(source, input, projectName, files);
      const enriched = analyzeContext(ctx);

      const renderer = options.format === 'json'
        ? new JsonRenderer()
        : new TerminalRenderer();

      renderer.render(enriched);
    } catch (err) {
      logger.error((err as Error).message);
      process.exit(1);
    }
  });

program
  .command('plan <input>')
  .description('Analisa e gera plano de migração completo (executa análise + planejamento)')
  .option('-v, --verbose', 'Habilita saída verbose')
  .option('-f, --format <format>', 'Formato de saída: terminal | json', 'terminal')
  .action(async (input: string, options: { verbose?: boolean; format?: string }) => {
    if (options.verbose) setVerbose(true);

    try {
      const source      = resolveSource(input);
      const files       = await source.load();
      const projectName = path.basename(input).replace(/\.zip$/i, '');

      logger.info(`Fonte: ${source.describe()}`);

      // Pipeline: fonte → contexto → análise → plano → renderização
      const ctx      = createContext(source, input, projectName, files);
      const analyzed = analyzeContext(ctx);
      const planned  = planContext(analyzed);

      const renderer = options.format === 'json'
        ? new JsonRenderer()
        : new TerminalRenderer();

      renderer.render(planned);
    } catch (err) {
      logger.error((err as Error).message);
      process.exit(1);
    }
  });

program
  .command('validate <input>')
  .description('Analisa, planeja e valida um projeto — exibe relatório de segurança sem gerar artefatos')
  .option('-v, --verbose', 'Habilita saída verbose')
  .option('-f, --format <format>', 'Formato de saída: terminal | json', 'terminal')
  .action(async (input: string, options: { verbose?: boolean; format?: string }) => {
    if (options.verbose) setVerbose(true);

    try {
      const source      = resolveSource(input);
      const files       = await source.load();
      const projectName = path.basename(input).replace(/\.zip$/i, '');

      logger.info(`Fonte: ${source.describe()}`);

      // Pipeline: fonte → contexto → análise → plano → validação → renderização
      const ctx       = createContext(source, input, projectName, files);
      const analyzed  = analyzeContext(ctx);
      const planned   = planContext(analyzed);
      const validated = validateContext(planned);

      const renderer = options.format === 'json'
        ? new JsonRenderer()
        : new TerminalRenderer();

      renderer.render(validated);

      // Sai com código 1 se há issues críticos — útil em pipelines CI/CD
      if (!validated.validation?.safeToMigrate) {
        process.exit(1);
      }
    } catch (err) {
      logger.error((err as Error).message);
      process.exit(1);
    }
  });

program
  .command('migrate <input>')
  .description('Executa análise + planejamento + validação + migração e gera artefatos no diretório de saída')
  .option('-v, --verbose', 'Habilita saída verbose')
  .option('-o, --output <dir>', 'Diretório de saída (padrão: ./output/<projeto>)')
  .option('-f, --format <format>', 'Formato de saída: terminal | json', 'terminal')
  .option('--force', 'Prossegue mesmo com issues críticos de validação')
  .action(async (input: string, options: { verbose?: boolean; output?: string; format?: string; force?: boolean }) => {
    if (options.verbose) setVerbose(true);

    try {
      const source      = resolveSource(input);
      const files       = await source.load();
      const projectName = path.basename(input).replace(/\.zip$/i, '');
      const outputDir   = options.output ?? path.join('output', projectName);

      logger.info(`Fonte: ${source.describe()}`);
      logger.info(`Saída: ${path.resolve(outputDir)}`);

      // Pipeline completo: fonte → contexto → análise → plano → validação → migração → renderização
      const ctx       = createContext(source, input, projectName, files);
      const analyzed  = analyzeContext(ctx);
      const planned   = planContext(analyzed);
      const validated = validateContext(planned);

      // Bloqueia se há issues críticos — use --force para prosseguir mesmo assim
      if (!validated.validation?.safeToMigrate && !options.force) {
        const count = validated.validation?.summary.criticalCount ?? 0;
        logger.error(`Validação bloqueou a migração: ${count} issue(s) crítico(s) detectado(s).`);
        logger.error('Use --force para prosseguir mesmo com issues críticos.');
        const renderer = options.format === 'json' ? new JsonRenderer() : new TerminalRenderer();
        renderer.render(validated);
        process.exit(1);
      }

      if (options.force && !validated.validation?.safeToMigrate) {
        logger.warn('--force ativado: prosseguindo com issues críticos de validação.');
      }

      const migrated = migrateContext(validated, outputDir);

      const renderer = options.format === 'json'
        ? new JsonRenderer()
        : new TerminalRenderer();

      renderer.render(migrated);
    } catch (err) {
      logger.error((err as Error).message);
      process.exit(1);
    }
  });

program.parse(process.argv);
