import type { ProjectContext } from '../../core/types';

export type Screen =
  | 'welcome'
  | 'project-select'
  | 'phase-runner'
  | 'analyze-review'
  | 'plan-review'
  | 'risk-review'
  | 'validate-review'
  | 'confirm-migrate'
  | 'dry-run-review'
  | 'artifact-browser'
  | 'summary'
  | 'error';

export type PhaseStatus = 'idle' | 'running' | 'done' | 'failed';

export interface PhaseState {
  readonly analyze:  PhaseStatus;
  readonly plan:     PhaseStatus;
  readonly validate: PhaseStatus;
  readonly migrate:  PhaseStatus;
  readonly deploy:   PhaseStatus;
  readonly execute:  PhaseStatus;
  readonly remote:   PhaseStatus;
}

export interface TuiSession {
  readonly screen:      Screen;
  readonly inputPath:   string;
  readonly outputDir:   string;
  readonly force:       boolean;
  readonly ctx:         ProjectContext | null;
  readonly phases:      PhaseState;
  readonly activePhase: string | null;
  readonly error:       string | null;
  readonly logs:        string[];
}

export type TuiAction =
  | { type: 'SET_SCREEN';       screen: Screen }
  | { type: 'SET_INPUT';        inputPath: string }
  | { type: 'SET_OUTPUT';       outputDir: string }
  | { type: 'SET_FORCE';        force: boolean }
  | { type: 'SET_CTX';          ctx: ProjectContext }
  | { type: 'SET_ACTIVE_PHASE'; phase: string | null }
  | { type: 'SET_PHASE';        phase: keyof PhaseState; status: PhaseStatus }
  | { type: 'SET_ERROR';        error: string }
  | { type: 'ADD_LOG';          line: string }
  | { type: 'CLEAR_LOGS' };
