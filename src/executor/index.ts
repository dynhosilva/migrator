import path from 'path';
import type { ProjectContext } from '../core/types';
import type { ExecutionState, GeneratedFile } from './types';
import { ExecutorRegistry }                   from './registry';
import { validateDockerArtifacts }            from './tasks/docker-artifact-validator';
import { validateBuildCommands }              from './tasks/build-command-validator';
import { checkEnvironment }                   from './tasks/environment-checker';
import { checkRuntimeCompatibility }          from './tasks/runtime-compatibility-checker';
import { generateExecutionPlan }              from './tasks/execution-plan-generator';
import { buildSummary }                       from './tasks/summary-builder';
import { generateDryRun }                     from './tasks/dry-run-generator';
import { writeGeneratedFiles }                from '../migrator/writer';
import { withExecution }                      from '../core';
import { logger }                             from '../logger';

/**
 * Ordem de registro intencional:
 *   1. dockerCheck  — sem deps
 *   2. buildCheck   — sem deps
 *   3. envCheck     — sem deps (sonda o sistema)
 *   4. runtimeCheck — depende de partial.envCheck.nodeVersion
 *   5. plan         — depende de partial.buildCheck e partial.dockerCheck
 *   6. summary      — depende de todos os checks acima
 *   7. dryRun       — depende de partial.plan, partial.summary, partial.envCheck
 */
const registry = new ExecutorRegistry()
  .register({
    key: 'dockerCheck',
    run: ({ ctx, outputDir }) => validateDockerArtifacts(ctx, outputDir),
  })
  .register({
    key: 'buildCheck',
    run: ({ ctx }) => validateBuildCommands(ctx),
  })
  .register({
    key: 'envCheck',
    run: ({ ctx }) => checkEnvironment(ctx),
  })
  .register({
    key: 'runtimeCheck',
    run: ({ ctx, partial }) => checkRuntimeCompatibility(ctx, partial.envCheck?.nodeVersion ?? null),
  })
  .register({
    key: 'plan',
    run: ({ ctx, partial }) => generateExecutionPlan(ctx, partial),
  })
  .register({
    key: 'summary',
    run: ({ partial }) => buildSummary(partial),
  })
  .register({
    key: 'dryRun',
    run: ({ ctx, partial }) => generateDryRun(ctx, partial),
  });

function collectExecutionFiles(partial: Partial<ExecutionState>): GeneratedFile[] {
  return [
    ...(partial.plan?.files    ?? []),
    ...(partial.dryRun?.files  ?? []),
  ];
}

/**
 * Valida artefatos, sonda o ambiente e gera plano + dry-run em outputDir/execution/.
 *
 * Limites de segurança (v1):
 *   - Nunca executa builds, docker run, ou qualquer comando que modifique estado
 *   - Sondas de ambiente são somente leitura (node --version, docker --version)
 *   - Toda escrita é restrita ao outputDir/execution/
 *   - O projeto original nunca é modificado
 *
 * @param ctx       ProjectContext com analysis, plan e deploy preenchidos
 * @param outputDir Caminho de saída — deve ser o mesmo usado nas fases anteriores
 */
export function executeProject(ctx: ProjectContext, outputDir: string): ExecutionState {
  if (!ctx.analysis) {
    throw new Error('executeProject requer análise prévia — execute analyzeContext antes.');
  }
  if (!ctx.plan) {
    throw new Error('executeProject requer planejamento prévio — execute planContext antes.');
  }

  const resolvedOutputDir = path.resolve(outputDir);
  logger.info(`Executando verificações de pré-voo em: ${resolvedOutputDir}`);

  const partial  = registry.run(ctx, resolvedOutputDir);
  const allFiles = collectExecutionFiles(partial);

  writeGeneratedFiles(resolvedOutputDir, allFiles);

  const readiness = partial.summary?.readiness ?? 'blocked';
  logger.info(`Prontidão de execução: ${readiness}`);

  return {
    projectName: ctx.analysis.projectName,
    outputDir:   resolvedOutputDir,
    dockerCheck: partial.dockerCheck!,
    buildCheck:  partial.buildCheck!,
    envCheck:    partial.envCheck!,
    runtimeCheck: partial.runtimeCheck!,
    plan:        partial.plan!,
    summary:     partial.summary!,
    dryRun:      partial.dryRun!,
    executedAt:  new Date().toISOString(),
  };
}

/**
 * Fase de execução do pipeline: enriquece o ProjectContext com ExecutionState.
 */
export function executeContext(ctx: ProjectContext, outputDir: string): ProjectContext {
  const result = executeProject(ctx, outputDir);
  return withExecution(ctx, result);
}

export type {
  ExecutionState,
  DockerArtifactCheck,
  BuildCommandCheck,
  EnvironmentCheck,
  RuntimeCompatibilityCheck,
  ExecutionPlanArtifacts,
  DryRunArtifacts,
  ExecutionSummary,
  ExecutionIssue,
  ExecutionStep,
  ExecutionReadiness,
  ExecutionIssueSeverity,
} from './types';
