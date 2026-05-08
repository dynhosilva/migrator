#!/usr/bin/env node
import { Command } from 'commander';
import path from 'path';
import fs from 'fs';
import { parseZip } from './parser/zip';
import { logger, setVerbose } from './logger';

const program = new Command();

program
  .name('lovable-migrate')
  .description('Migration engine for Lovable.dev exported projects')
  .version('0.1.0');

program
  .command('inspect <zipFile>')
  .description('Inspect a Lovable.dev exported ZIP file')
  .option('-v, --verbose', 'Enable verbose output')
  .action((zipFile: string, options: { verbose?: boolean }) => {
    if (options.verbose) setVerbose(true);

    const resolvedPath = path.resolve(zipFile);

    if (!fs.existsSync(resolvedPath)) {
      logger.error(`File not found: ${resolvedPath}`);
      process.exit(1);
    }

    if (path.extname(resolvedPath).toLowerCase() !== '.zip') {
      logger.error('Input file must be a .zip archive');
      process.exit(1);
    }

    const project = parseZip(resolvedPath);

    console.log('');
    logger.info(`Project : ${project.name}`);
    logger.info(`Files   : ${project.totalFiles}`);
    logger.info(`Dirs    : ${project.totalDirectories}`);

    if (options.verbose) {
      console.log('');
      project.entries
        .filter((e) => !e.isDirectory)
        .forEach((e) => logger.debug(`  ${e.path} (${e.size}b)`));
    }
  });

program.parse(process.argv);
