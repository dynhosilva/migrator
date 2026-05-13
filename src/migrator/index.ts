import path from 'path';
import type { ProjectContext } from '../core/types';
import type { MigrationResult } from './types';
import { MigratorRegistry }            from './registry';
import { generateEnvFiles }            from './tasks/env-generator';
import { exportMigrations }            from './tasks/migration-exporter';
import { exportEdgeFunctions }         from './tasks/edge-function-exporter';
import { generateDeployInstructions }  from './tasks/deploy-instruction-generator';
import { generateFolderReadmes }       from './tasks/folder-readme-generator';
import { generateSummary }             from './tasks/summary-generator';
import { writeGeneratedFiles, collectAllFiles } from './writer';
import { withMigration } from '../core';
import { logger }        from '../logger';

/**
 * Registry de tasks do migrator.
 *
 * Ordem de registro intencional:
 *   - env, migrations, edgeFunctions, deployInstructions, folderReadmes: sem dependências entre si
 *   - report (summaryGenerator): deve rodar por último — lê partial de todas as outras tasks
 *
 * Para adicionar nova task: .register({ key: 'minhaChave', run: ... })
 */
const registry = new MigratorRegistry()
  .register({ key: 'env',                run: ({ ctx })          => generateEnvFiles(ctx) })
  .register({ key: 'migrations',         run: ({ ctx })          => exportMigrations(ctx) })
  .register({ key: 'edgeFunctions',      run: ({ ctx })          => exportEdgeFunctions(ctx) })
  .register({ key: 'deployInstructions', run: ({ ctx })          => generateDeployInstructions(ctx) })
  .register({ key: 'folderReadmes',      run: ({ ctx })          => generateFolderReadmes(ctx) })
  // report deve rodar por último — lê partial de todas as tasks anteriores
  .register({ key: 'report',             run: ({ ctx, partial }) => generateSummary(ctx, partial) });

/**
 * Gera todos os artefatos de migração em memória (sem I/O) e escreve para outputDir.
 *
 * Limites de segurança (v1):
 *   - Nunca modifica arquivos do projeto original
 *   - Toda escrita é restrita ao outputDir
 *   - Não executa SQL, deploy, login ou provisionamento
 *   - Não sobrescreve arquivos fora do outputDir (verificado em writer.ts)
 *
 * @param ctx      ProjectContext com analysis e plan preenchidos
 * @param outputDir Caminho absoluto ou relativo onde os artefatos serão gerados
 */
export function migrateProject(ctx: ProjectContext, outputDir: string): MigrationResult {
  if (!ctx.analysis) {
    throw new Error('migrateProject requer análise prévia — execute analyzeContext antes.');
  }
  if (!ctx.plan) {
    throw new Error('migrateProject requer planejamento prévio — execute planContext antes.');
  }

  const resolvedOutputDir = path.resolve(outputDir);
  logger.info(`Gerando artefatos de migração em: ${resolvedOutputDir}`);

  // 1. Executa todas as tasks (puro — sem I/O)
  const partial = registry.run(ctx);

  // 2. Coleta todos os GeneratedFile[] (puro — sem I/O)
  const allFiles = collectAllFiles(partial);

  // 3. Escreve os arquivos em disco (única camada com I/O)
  writeGeneratedFiles(resolvedOutputDir, allFiles);

  logger.info(`${allFiles.length} ${allFiles.length === 1 ? 'arquivo gerado' : 'arquivos gerados'} em: ${resolvedOutputDir}`);

  return {
    projectName:         ctx.analysis.projectName,
    outputDir:           resolvedOutputDir,
    env:                 partial.env!,
    migrations:          partial.migrations!,
    edgeFunctions:       partial.edgeFunctions!,
    deployInstructions:  partial.deployInstructions!,
    folderReadmes:       partial.folderReadmes!,
    report:              partial.report!,
    migratedAt:          new Date().toISOString(),
  };
}

/**
 * Fase de migração do pipeline: enriquece o ProjectContext com MigrationResult.
 * Requer que ctx.analysis e ctx.plan já estejam preenchidos.
 */
export function migrateContext(ctx: ProjectContext, outputDir: string): ProjectContext {
  const result = migrateProject(ctx, outputDir);
  return withMigration(ctx, result);
}

export type {
  MigrationResult,
  GeneratedFile,
  EnvArtifacts,
  MigrationExportArtifacts,
  EdgeFunctionArtifacts,
  DeployInstructionsArtifact,
  FolderReadmeArtifacts,
  MigrationReportArtifact,
} from './types';
