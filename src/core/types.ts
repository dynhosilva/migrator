import type { ProjectFile, SourceKind } from '../sources/types';
import type { AnalysisReport } from '../analyzer/types';
import type { MigrationPlan } from '../planner/types';
import type { MigrationResult } from '../migrator/types';
import type { ValidationResult } from '../validator/types';
import type { DeployState } from '../deploy/types';
import type { ExecutionState } from '../executor/types';
import type { RuntimeState } from '../runtime/types';
import type { RemoteState } from '../remote/types';
import type { CicdState } from '../cicd/types';

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

  // Preenchido pela fase de planejamento
  readonly plan?: MigrationPlan;

  // Preenchido pela fase de validação
  readonly validation?: ValidationResult;

  // Preenchido pela fase de migração
  readonly migration?: MigrationResult;

  // Preenchido pela fase de deploy
  readonly deploy?: DeployState;

  // Preenchido pela fase de execução (verificações de pré-voo + plano)
  readonly execution?: ExecutionState;

  // Preenchido pela fase de runtime (execução local real: install, build, docker)
  readonly runtime?: RuntimeState;

  // Preenchido pela fase de remote (planejamento de deploy remoto — sem SSH real)
  readonly remote?: RemoteState;

  // Preenchido pela fase de cicd (geração de workflows GitHub Actions)
  readonly cicd?: CicdState;
}
