#!/usr/bin/env node
import path from 'path';
import { Command } from 'commander';
import { resolveSource } from './sources';
import { analyzeProject, printReport } from './analyzer';
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
  .action(async (input: string, options: { verbose?: boolean }) => {
    if (options.verbose) setVerbose(true);

    try {
      const source = resolveSource(input);
      logger.info(`Fonte: ${source.describe()}`);

      const files = await source.load();

      const projectName = path.basename(input).replace(/\.zip$/i, '');
      const report = analyzeProject(files, projectName);

      printReport(report);
    } catch (err) {
      logger.error((err as Error).message);
      process.exit(1);
    }
  });

program.parse(process.argv);
