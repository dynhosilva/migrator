import path from 'path';
import type { ProjectContext } from '../core/types';
import type { RemoteState, RemoteOptions, RemoteConfig, RemoteReadiness, GeneratedFile } from './types';
import { mergeHostProfile, DEFAULT_HOST_PROFILE } from './host';
import { mergeSshConfig, DEFAULT_SSH_CONFIG } from './ssh';
import { RemoteRegistry } from './registry';
import { writeGeneratedFiles } from '../migrator/writer';
import { withRemote } from '../core';
import { logger } from '../logger';

import { checkHostCompatibility }  from './tasks/host-compatibility-checker';
import { validateSshConfig }       from './tasks/ssh-config-validator';
import { planTransfer }             from './tasks/transfer-planner';
import { checkDeploymentStrategy } from './tasks/deployment-strategy-checker';
import { planRemoteExecution }     from './tasks/remote-execution-planner';
import { generateRemoteDryRun }    from './tasks/remote-dry-run-generator';
import { buildRemoteSummary }      from './tasks/remote-summary-builder';

const DEFAULT_REMOTE_PATH = '/opt/app';

const registry = new RemoteRegistry()
  .register({ key: 'hostCheck',       run: ({ ctx, config })          => checkHostCompatibility(ctx, config.hostProfile) })
  .register({ key: 'sshCheck',        run: ({ config })               => validateSshConfig(config.sshConfig) })
  .register({ key: 'transferPlan',    run: ({ ctx, config })          => planTransfer(ctx, config.remotePath) })
  .register({ key: 'deploymentCheck', run: ({ ctx, config })          => checkDeploymentStrategy(ctx, config.hostProfile) })
  .register({ key: 'executionPlan',   run: ({ ctx, config, partial }) => planRemoteExecution(ctx, config, partial) })
  .register({ key: 'dryRun',          run: ({ ctx, config, partial }) => generateRemoteDryRun(ctx, config, partial) })
  .register({ key: 'summary',         run: ({ ctx, config, partial }) => buildRemoteSummary(ctx, config, partial) });

function resolveConfig(options: RemoteOptions): RemoteConfig {
  return {
    sshConfig:   mergeSshConfig(options.sshConfig),
    hostProfile: mergeHostProfile(options.hostProfile),
    remotePath:  options.remotePath ?? DEFAULT_REMOTE_PATH,
  };
}

function collectAllFiles(partial: Partial<RemoteState>): GeneratedFile[] {
  return [
    ...(partial.executionPlan?.files ?? []),
    ...(partial.dryRun?.files        ?? []),
    ...(partial.summary?.files       ?? []),
  ];
}

function computeReadiness(partial: Partial<RemoteState>): RemoteReadiness {
  const allIssues = [
    ...(partial.hostCheck?.issues       ?? []),
    ...(partial.sshCheck?.issues        ?? []),
    ...(partial.transferPlan?.issues    ?? []),
    ...(partial.deploymentCheck?.issues ?? []),
  ];
  if (allIssues.some((i) => i.severity === 'blocker')) return 'blocked';
  if (allIssues.some((i) => i.severity === 'warning')) return 'ready-with-warnings';
  return 'ready';
}

/**
 * Executa o planejamento remoto (pure modeling — sem SSH real, sem deploy real).
 *
 * O remote v1 nunca:
 *   - Abre conexões SSH reais
 *   - Executa comandos remotos
 *   - Sobe containers ou deploya em produção
 *   - Modifica arquivos do projeto original
 *
 * O remote v1 faz:
 *   - Valida perfil do host (simulado)
 *   - Valida formato da configuração SSH
 *   - Planeja lista de arquivos a transferir
 *   - Valida compatibilidade de estratégia de deploy
 *   - Gera plano de execução remota (JSON)
 *   - Gera dry-run legível (Markdown)
 *   - Gera sumário do planejamento (Markdown)
 */
export function prepareRemote(
  ctx: ProjectContext,
  outputDir: string,
  options: RemoteOptions = {},
): RemoteState {
  const config = resolveConfig(options);
  const resolvedOutputDir = path.resolve(outputDir);

  logger.info(`Planejando deploy remoto para: ${config.sshConfig.host}:${config.remotePath}`);

  const partial = registry.run(ctx, resolvedOutputDir, config);

  const files = collectAllFiles(partial);
  writeGeneratedFiles(resolvedOutputDir, files);

  logger.info(`${files.length} artefato(s) de planejamento remoto gerado(s) em: ${resolvedOutputDir}/remote`);

  return {
    projectName:     ctx.meta.name,
    outputDir:       resolvedOutputDir,
    remotePath:      config.remotePath,
    hostCheck:       partial.hostCheck!,
    sshCheck:        partial.sshCheck!,
    transferPlan:    partial.transferPlan!,
    deploymentCheck: partial.deploymentCheck!,
    executionPlan:   partial.executionPlan!,
    dryRun:          partial.dryRun!,
    summary:         partial.summary!,
    readiness:       computeReadiness(partial),
    preparedAt:      new Date().toISOString(),
  };
}

/**
 * Fase remote do pipeline: enriquece o ProjectContext com RemoteState.
 */
export function prepareContext(
  ctx: ProjectContext,
  outputDir: string,
  options: RemoteOptions = {},
): ProjectContext {
  const state = prepareRemote(ctx, outputDir, options);
  return withRemote(ctx, state);
}

export { DEFAULT_HOST_PROFILE, mergeHostProfile } from './host';
export { DEFAULT_SSH_CONFIG, mergeSshConfig } from './ssh';
export type {
  RemoteState,
  RemoteOptions,
  RemoteConfig,
  RemoteReadiness,
  HostProfile,
  SshConfig,
  HostCompatibilityResult,
  SshValidationResult,
  TransferPlanResult,
  TransferFile,
  DeploymentStrategyResult,
  RemoteExecutionPlanArtifacts,
  RemoteDryRunArtifacts,
  RemoteSummaryArtifacts,
  RemoteIssue,
  RemoteIssueSeverity,
  RemoteStep,
} from './types';
