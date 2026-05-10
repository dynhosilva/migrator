import type { ProjectFile, SourceKind } from '../sources/types';
import type { AnalysisReport } from '../analyzer/types';

export interface SourceInfo {
  kind: SourceKind;
  description: string;
  inputPath: string;
}

export interface ProjectMeta {
  name: string;
  createdAt: string;
}

/**
 * Espinha dorsal do pipeline da engine.
 *
 * Cada fase (analyze → plan → migrate → deploy) recebe este contexto
 * e retorna uma versão enriquecida com seu próprio campo preenchido.
 * Nunca mutamos o contexto — sempre criamos um novo via spread.
 *
 * Campos opcionais são preenchidos progressivamente conforme o pipeline avança.
 * Fases futuras adicionarão seus próprios campos sem quebrar o contrato atual.
 */
export interface ProjectContext {
  readonly meta: ProjectMeta;
  readonly source: SourceInfo;
  readonly files: ProjectFile[];

  // Preenchido pela fase de análise
  readonly analysis?: AnalysisReport;

  // Fases futuras (não implementadas — reservado para extensão):
  // readonly plan?: MigrationPlan;
  // readonly migration?: MigrationResult;
  // readonly deploy?: DeployState;
}
