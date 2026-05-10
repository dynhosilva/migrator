import type { ProjectContext } from '../core/types';
import type { AnalysisReport } from '../analyzer/types';
import type { MigrationPlan } from './types';
import { PlannerRegistry }    from './registry';
import { planCompatibility }  from './strategies/compatibility';
import { planInfrastructure } from './strategies/infrastructure';
import { planEnv }            from './strategies/env';
import { planSupabase }       from './strategies/supabase';
import { planDeployStrategy } from './strategies/deploy';
import { detectRisks }        from './strategies/risk';
import { generateChecklist }  from './strategies/checklist';
import { logger }   from '../logger';
import { withPlan } from '../core';

/**
 * Registry de strategies do planner.
 *
 * A ordem de registro é intencional:
 *   - compatibility e infrastructure devem rodar antes de deployStrategy (deployStrategy lê partial.compatibility)
 *   - risks lê partial.compatibility, .infrastructure, .env, .supabase
 *   - checklist lê partial.risks, .supabase, .env, .deployStrategy, .infrastructure
 *
 * Para adicionar nova strategy: .register({ key: 'minhaChave', plan: ... })
 */
const registry = new PlannerRegistry()
  .register({ key: 'compatibility',  plan: ({ analysis })          => planCompatibility(analysis) })
  .register({ key: 'infrastructure', plan: ({ analysis })          => planInfrastructure(analysis) })
  .register({ key: 'env',            plan: ({ analysis })          => planEnv(analysis) })
  .register({ key: 'supabase',       plan: ({ analysis })          => planSupabase(analysis) })
  // deployStrategy lê partial.compatibility e partial.infrastructure — registrar após ambos
  .register({ key: 'deployStrategy', plan: ({ analysis, partial }) => planDeployStrategy(analysis, partial) })
  // risks lê partial.compatibility, .infrastructure, .env, .supabase
  .register({ key: 'risks',          plan: ({ analysis, partial }) => detectRisks(analysis, partial) })
  // checklist lê partial.risks, .supabase, .env, .deployStrategy, .infrastructure
  .register({ key: 'checklist',      plan: ({ analysis, partial }) => generateChecklist(analysis, partial) });

function collectWarnings(partial: Partial<MigrationPlan>): string[] {
  const warnings: string[] = [];
  if (partial.env?.warnings)      warnings.push(...partial.env.warnings);
  if (partial.supabase?.warnings) warnings.push(...partial.supabase.warnings);
  return warnings;
}

/**
 * Gera um MigrationPlan a partir de um AnalysisReport.
 * Mantido para uso programático direto — novo código no pipeline deve usar planContext.
 */
export function planProject(analysis: AnalysisReport): MigrationPlan {
  logger.info('Gerando plano de migração...');
  const partial = registry.run(analysis);
  logger.info('Plano gerado.');

  return {
    projectName:    analysis.projectName,
    compatibility:  partial.compatibility!,
    infrastructure: partial.infrastructure!,
    env:            partial.env!,
    supabase:       partial.supabase!,
    deployStrategy: partial.deployStrategy!,
    risks:          partial.risks!,
    checklist:      partial.checklist!,
    warnings:       collectWarnings(partial),
    plannedAt:      new Date().toISOString(),
  };
}

/**
 * Fase de planejamento do pipeline: enriquece o ProjectContext com MigrationPlan.
 * Requer que ctx.analysis já esteja preenchido (execute analyzeContext antes).
 */
export function planContext(ctx: ProjectContext): ProjectContext {
  if (!ctx.analysis) {
    throw new Error('planContext requer análise prévia — execute analyzeContext antes de planContext.');
  }
  const plan = planProject(ctx.analysis);
  return withPlan(ctx, plan);
}

export type {
  MigrationPlan,
  CompatibilityResult,
  InfrastructureResult,
  EnvResult,
  SupabasePlanResult,
  DeployStrategyResult,
  Risk,
  ChecklistItem,
  Confidence,
  RiskLevel,
  DeployTarget,
} from './types';
