#!/usr/bin/env node
import path from 'path';
import { Command } from 'commander';
import { resolveSource }   from './sources';
import { analyzeContext }  from './analyzer';
import { planContext }     from './planner';
import { validateContext } from './validator';
import { migrateContext }  from './migrator';
import { deployContext }   from './deploy';
import { executeContext }  from './executor';
import { runContext }      from './runtime';
import { prepareContext }  from './remote';
import { startServer }     from './server';
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

program
  .command('deploy <input>')
  .description('Pipeline completo + gera artefatos Docker (Dockerfile, docker-compose.yml, .dockerignore)')
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

      const ctx       = createContext(source, input, projectName, files);
      const analyzed  = analyzeContext(ctx);
      const planned   = planContext(analyzed);
      const validated = validateContext(planned);

      if (!validated.validation?.safeToMigrate && !options.force) {
        const count = validated.validation?.summary.criticalCount ?? 0;
        logger.error(`Validação bloqueou o deploy: ${count} issue(s) crítico(s) detectado(s).`);
        logger.error('Use --force para prosseguir mesmo com issues críticos.');
        const renderer = options.format === 'json' ? new JsonRenderer() : new TerminalRenderer();
        renderer.render(validated);
        process.exit(1);
      }

      if (options.force && !validated.validation?.safeToMigrate) {
        logger.warn('--force ativado: prosseguindo com issues críticos de validação.');
      }

      const migrated  = migrateContext(validated, outputDir);
      const deployed  = deployContext(migrated, outputDir);

      const renderer = options.format === 'json'
        ? new JsonRenderer()
        : new TerminalRenderer();

      renderer.render(deployed);
    } catch (err) {
      logger.error((err as Error).message);
      process.exit(1);
    }
  });

program
  .command('execute <input>')
  .description('Pipeline completo + verifica ambiente + gera plano de execução e dry-run')
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

      const ctx       = createContext(source, input, projectName, files);
      const analyzed  = analyzeContext(ctx);
      const planned   = planContext(analyzed);
      const validated = validateContext(planned);

      if (!validated.validation?.safeToMigrate && !options.force) {
        const count = validated.validation?.summary.criticalCount ?? 0;
        logger.error(`Validação bloqueou o pipeline: ${count} issue(s) crítico(s) detectado(s).`);
        logger.error('Use --force para prosseguir mesmo com issues críticos.');
        const renderer = options.format === 'json' ? new JsonRenderer() : new TerminalRenderer();
        renderer.render(validated);
        process.exit(1);
      }

      if (options.force && !validated.validation?.safeToMigrate) {
        logger.warn('--force ativado: prosseguindo com issues críticos de validação.');
      }

      const migrated  = migrateContext(validated, outputDir);
      const deployed  = deployContext(migrated, outputDir);
      const executed  = executeContext(deployed, outputDir);

      const renderer = options.format === 'json'
        ? new JsonRenderer()
        : new TerminalRenderer();

      renderer.render(executed);
    } catch (err) {
      logger.error((err as Error).message);
      process.exit(1);
    }
  });

program
  .command('runtime <input>')
  .description('Pipeline completo + execução local real (install, build, docker build)')
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

      const ctx       = createContext(source, input, projectName, files);
      const analyzed  = analyzeContext(ctx);
      const planned   = planContext(analyzed);
      const validated = validateContext(planned);

      if (!validated.validation?.safeToMigrate && !options.force) {
        const count = validated.validation?.summary.criticalCount ?? 0;
        logger.error(`Validação bloqueou o pipeline: ${count} issue(s) crítico(s) detectado(s).`);
        logger.error('Use --force para prosseguir mesmo com issues críticos.');
        const renderer = options.format === 'json' ? new JsonRenderer() : new TerminalRenderer();
        renderer.render(validated);
        process.exit(1);
      }

      if (options.force && !validated.validation?.safeToMigrate) {
        logger.warn('--force ativado: prosseguindo com issues críticos de validação.');
      }

      const migrated  = migrateContext(validated, outputDir);
      const deployed  = deployContext(migrated, outputDir);
      const executed  = executeContext(deployed, outputDir);
      // projectDir = input (diretório fonte onde npm install e build rodam)
      const ran       = await runContext(executed, outputDir, path.resolve(input));

      const renderer = options.format === 'json'
        ? new JsonRenderer()
        : new TerminalRenderer();

      renderer.render(ran);
    } catch (err) {
      logger.error((err as Error).message);
      process.exit(1);
    }
  });

program
  .command('remote <input>')
  .description('Pipeline completo + planejamento de deploy remoto (sem SSH real, sem deploy real)')
  .option('-v, --verbose', 'Habilita saída verbose')
  .option('-o, --output <dir>', 'Diretório de saída (padrão: ./output/<projeto>)')
  .option('-f, --format <format>', 'Formato de saída: terminal | json', 'terminal')
  .option('--force', 'Prossegue mesmo com issues críticos de validação')
  .option('--host <host>', 'Hostname ou IP do servidor remoto')
  .option('--user <user>', 'Usuário SSH')
  .option('--key <key>', 'Caminho para chave SSH')
  .option('--remote-path <path>', 'Caminho no servidor remoto (padrão: /opt/app)')
  .action(async (input: string, options: {
    verbose?: boolean; output?: string; format?: string; force?: boolean;
    host?: string; user?: string; key?: string; remotePath?: string;
  }) => {
    if (options.verbose) setVerbose(true);

    try {
      const source      = resolveSource(input);
      const files       = await source.load();
      const projectName = path.basename(input).replace(/\.zip$/i, '');
      const outputDir   = options.output ?? path.join('output', projectName);

      logger.info(`Fonte: ${source.describe()}`);
      logger.info(`Saída: ${path.resolve(outputDir)}`);

      const ctx       = createContext(source, input, projectName, files);
      const analyzed  = analyzeContext(ctx);
      const planned   = planContext(analyzed);
      const validated = validateContext(planned);

      if (!validated.validation?.safeToMigrate && !options.force) {
        const count = validated.validation?.summary.criticalCount ?? 0;
        logger.error(`Validação bloqueou o pipeline: ${count} issue(s) crítico(s) detectado(s).`);
        logger.error('Use --force para prosseguir mesmo com issues críticos.');
        const renderer = options.format === 'json' ? new JsonRenderer() : new TerminalRenderer();
        renderer.render(validated);
        process.exit(1);
      }

      if (options.force && !validated.validation?.safeToMigrate) {
        logger.warn('--force ativado: prosseguindo com issues críticos de validação.');
      }

      const migrated = migrateContext(validated, outputDir);
      const deployed = deployContext(migrated, outputDir);

      const remoteOptions = {
        sshConfig: {
          ...(options.host ? { host: options.host } : {}),
          ...(options.user ? { user: options.user } : {}),
          ...(options.key  ? { keyPath: options.key } : {}),
        },
        remotePath: options.remotePath,
      };

      const planned2 = prepareContext(deployed, outputDir, remoteOptions);

      const renderer = options.format === 'json'
        ? new JsonRenderer()
        : new TerminalRenderer();

      renderer.render(planned2);
    } catch (err) {
      logger.error((err as Error).message);
      process.exit(1);
    }
  });

program
  .command('server')
  .description('Inicia o servidor HTTP da API (padrão: http://127.0.0.1:3001)')
  .option('-p, --port <port>', 'Porta do servidor', '3001')
  .option('--host <host>', 'Host de escuta', '127.0.0.1')
  .action(async (options: { port?: string; host?: string }) => {
    const port = parseInt(options.port ?? '3001', 10);
    const host = options.host ?? '127.0.0.1';
    await startServer({ port, host });
  });

program.parse(process.argv);
