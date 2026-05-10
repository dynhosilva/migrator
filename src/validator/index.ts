import type { ProjectContext } from '../core/types';
import { withValidation } from '../core';
import type { ValidationIssue, ValidationResult } from './types';
import { ValidationRegistry } from './registry';
import { filesystemRule }         from './rules/filesystem';
import { frameworkRule }          from './rules/framework';
import { buildSystemRule }        from './rules/build-system';
import { envRule }                from './rules/env';
import { deployCompatibilityRule } from './rules/deploy-compatibility';
import { supabaseRule }           from './rules/supabase';
import { migrationSafetyRule }    from './rules/migration-safety';

// Ordem de registro: filesystem primeiro (mais fundamental), depois semântica de domínio
const registry = new ValidationRegistry()
  .register(filesystemRule)
  .register(frameworkRule)
  .register(buildSystemRule)
  .register(envRule)
  .register(deployCompatibilityRule)
  .register(supabaseRule)
  .register(migrationSafetyRule);

function partition(issues: ValidationIssue[]) {
  return {
    blockingIssues: issues.filter((i) => i.severity === 'critical'),
    warnings:       issues.filter((i) => i.severity === 'warning'),
    infos:          issues.filter((i) => i.severity === 'info'),
  };
}

export function validateProject(ctx: ProjectContext): ValidationResult {
  if (!ctx.analysis) {
    throw new Error('[validator] ctx.analysis ausente — execute analyzeContext primeiro.');
  }
  if (!ctx.plan) {
    throw new Error('[validator] ctx.plan ausente — execute planContext primeiro.');
  }

  const { issues, rulesExecuted } = registry.run(ctx);
  const { blockingIssues, warnings, infos } = partition(issues);

  return {
    issues,
    blockingIssues,
    warnings,
    infos,
    safeToMigrate: blockingIssues.length === 0,
    summary: {
      totalIssues:   issues.length,
      criticalCount: blockingIssues.length,
      warningCount:  warnings.length,
      infoCount:     infos.length,
      rulesExecuted,
    },
    validatedAt: new Date().toISOString(),
  };
}

export function validateContext(ctx: ProjectContext): ProjectContext {
  const validation = validateProject(ctx);
  return withValidation(ctx, validation);
}

export type { ValidationResult, ValidationIssue, ValidationSeverity, ValidationSummary } from './types';
export type { ValidationRule } from './registry';
export { ValidationRegistry } from './registry';
