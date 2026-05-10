import type { ProjectSource, ProjectFile } from '../sources/types';
import type { AnalysisReport } from '../analyzer/types';
import type { MigrationPlan } from '../planner/types';
import type { MigrationResult } from '../migrator/types';
import type { ValidationResult } from '../validator/types';
import type { DeployState } from '../deploy/types';
import type { ExecutionState } from '../executor/types';
import type { ProjectContext } from './types';

export type { ProjectContext, SourceInfo, ProjectMeta } from './types';

/** Cria o contexto inicial do pipeline a partir de uma fonte já carregada. */
export function createContext(
  source: ProjectSource,
  inputPath: string,
  projectName: string,
  files: ProjectFile[],
): ProjectContext {
  return {
    meta: {
      name: projectName,
      createdAt: new Date().toISOString(),
    },
    source: {
      kind: source.kind,
      description: source.describe(),
      inputPath,
    },
    files,
  };
}

/** Retorna novo contexto imutável com o resultado da análise preenchido. */
export function withAnalysis(ctx: ProjectContext, analysis: AnalysisReport): ProjectContext {
  return { ...ctx, analysis };
}

/** Retorna novo contexto imutável com o plano de migração preenchido. */
export function withPlan(ctx: ProjectContext, plan: MigrationPlan): ProjectContext {
  return { ...ctx, plan };
}

/** Retorna novo contexto imutável com o resultado da validação preenchido. */
export function withValidation(ctx: ProjectContext, validation: ValidationResult): ProjectContext {
  return { ...ctx, validation };
}

/** Retorna novo contexto imutável com o resultado da migração preenchido. */
export function withMigration(ctx: ProjectContext, migration: MigrationResult): ProjectContext {
  return { ...ctx, migration };
}

/** Retorna novo contexto imutável com o resultado do deploy preenchido. */
export function withDeploy(ctx: ProjectContext, deploy: DeployState): ProjectContext {
  return { ...ctx, deploy };
}

/** Retorna novo contexto imutável com o resultado da execução preenchido. */
export function withExecution(ctx: ProjectContext, execution: ExecutionState): ProjectContext {
  return { ...ctx, execution };
}
