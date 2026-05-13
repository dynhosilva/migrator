/**
 * Tipos de objetos de workflow GitHub Actions.
 *
 * Espelham o schema real do GitHub Actions para garantir que o output
 * seja gerado de forma tipada — sem string concatenation manual.
 * Intencionalmente minimalista: apenas os campos usados pelo gerador.
 */

export interface WorkflowStep {
  name?: string;
  uses?: string;
  run?: string;
  with?: Record<string, string | number>;
  env?: Record<string, string>;
}

export interface NodeMatrixStrategy {
  matrix: {
    'node-version': readonly number[];
  };
  'fail-fast'?: boolean;
}

export interface WorkflowJob {
  'runs-on': string;
  strategy?: NodeMatrixStrategy;
  steps: WorkflowStep[];
}

export interface PushTrigger {
  branches?: readonly string[];
  tags?: readonly string[];
}

export interface WorkflowTriggers {
  push?: PushTrigger;
  pull_request?: PushTrigger;
}

export interface GithubWorkflow {
  name: string;
  on: WorkflowTriggers;
  jobs: Record<string, WorkflowJob>;
}
