/**
 * Serializers — transformam ProjectContext em shapes focadas para a API.
 *
 * Cada função extrai apenas os campos relevantes para a fase, evitando
 * expor a estrutura interna completa do contexto ao chamador da API.
 */

import type { ProjectContext } from '../../core/types';

export function serializeAnalysis(ctx: ProjectContext): Record<string, unknown> {
  const { analysis } = ctx;
  if (!analysis) return {};
  return {
    projectName:    analysis.projectName,
    framework:      analysis.framework,
    buildSystem:    analysis.buildSystem,
    packageManager: analysis.packageManager,
    language:       analysis.language,
    supabase:       { detected: analysis.supabase.detected, hasEdgeFunctions: analysis.supabase.edgeFunctions.count > 0 },
    tailwind:       { detected: analysis.tailwind.detected },
    lovable:        { detected: analysis.lovable.detected },
    envVars:        analysis.envVars,
    routes:         analysis.routes,
    detectedAt:     analysis.detectedAt,
  };
}

export function serializePlan(ctx: ProjectContext): Record<string, unknown> {
  const { plan } = ctx;
  if (!plan) return {};
  return {
    projectName:    plan.projectName,
    deployStrategy: plan.deployStrategy,
    infrastructure: plan.infrastructure,
    compatibility:  plan.compatibility,
    env:            { required: plan.env.required, missing: plan.env.missing },
    risks:          plan.risks,
    checklist:      plan.checklist,
    warnings:       plan.warnings,
    plannedAt:      plan.plannedAt,
  };
}

export function serializeValidation(ctx: ProjectContext): Record<string, unknown> {
  const { validation } = ctx;
  if (!validation) return {};
  return {
    safeToMigrate:  validation.safeToMigrate,
    blockingIssues: validation.blockingIssues,
    warnings:       validation.warnings,
    infos:          validation.infos,
    summary:        validation.summary,
    validatedAt:    validation.validatedAt,
  };
}

export function serializeMigration(ctx: ProjectContext): Record<string, unknown> {
  const { migration } = ctx;
  if (!migration) return {};
  return {
    projectName:        migration.projectName,
    outputDir:          migration.outputDir,
    filesGenerated:     migration.report.totalFilesGenerated,
    pendingManualSteps: migration.report.pendingManualSteps,
    warnings:           migration.report.warnings,
    migratedAt:         migration.migratedAt,
  };
}

export function serializeDeploy(ctx: ProjectContext): Record<string, unknown> {
  const { deploy } = ctx;
  if (!deploy) return {};
  return {
    projectName:    deploy.projectName,
    strategy:       deploy.docker.strategy,
    baseImage:      deploy.docker.baseImage,
    exposedPort:    deploy.docker.exposedPort,
    filesGenerated: deploy.report.totalFilesGenerated,
    notes:          deploy.report.notes,
    deployedAt:     deploy.deployedAt,
  };
}

export function serializeExecution(ctx: ProjectContext): Record<string, unknown> {
  const { execution } = ctx;
  if (!execution) return {};
  return {
    projectName: execution.projectName,
    readiness:   execution.summary.readiness,
    blockers:    execution.summary.blockers,
    warnings:    execution.summary.warnings,
    plan:        { steps: execution.plan.steps },
    envCheck:    {
      nodeAvailable:             execution.envCheck.nodeAvailable,
      nodeVersion:               execution.envCheck.nodeVersion,
      dockerAvailable:           execution.envCheck.dockerAvailable,
      packageManagerAvailable:   execution.envCheck.packageManagerAvailable,
    },
    executedAt: execution.executedAt,
  };
}

export function serializeRemote(ctx: ProjectContext): Record<string, unknown> {
  const { remote } = ctx;
  if (!remote) return {};
  return {
    projectName:     remote.projectName,
    readiness:       remote.readiness,
    remotePath:      remote.remotePath,
    hostCompatible:  remote.hostCheck.compatible,
    sshValid:        remote.sshCheck.valid,
    deployStrategy:  remote.deploymentCheck.strategy,
    deployCompatible: remote.deploymentCheck.compatible,
    transferFiles:   remote.transferPlan.files.length,
    transferSizeKB:  remote.transferPlan.totalEstimatedSizeKB,
    executionSteps:  remote.executionPlan.steps,
    issues:          [
      ...remote.hostCheck.issues,
      ...remote.sshCheck.issues,
      ...remote.transferPlan.issues,
      ...remote.deploymentCheck.issues,
    ],
    preparedAt: remote.preparedAt,
  };
}
