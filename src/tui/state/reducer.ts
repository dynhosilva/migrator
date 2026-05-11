import type { TuiSession, TuiAction, PhaseState } from './types';

const INITIAL_PHASES: PhaseState = {
  analyze:  'idle',
  plan:     'idle',
  validate: 'idle',
  migrate:  'idle',
  deploy:   'idle',
  execute:  'idle',
  remote:   'idle',
};

export const INITIAL_SESSION: TuiSession = {
  screen:      'welcome',
  inputPath:   '',
  outputDir:   '',
  force:       false,
  ctx:         null,
  phases:      INITIAL_PHASES,
  activePhase: null,
  error:       null,
  logs:        [],
};

export function tuiReducer(state: TuiSession, action: TuiAction): TuiSession {
  switch (action.type) {
    case 'SET_SCREEN':
      return { ...state, screen: action.screen };
    case 'SET_INPUT':
      return { ...state, inputPath: action.inputPath };
    case 'SET_OUTPUT':
      return { ...state, outputDir: action.outputDir };
    case 'SET_FORCE':
      return { ...state, force: action.force };
    case 'SET_CTX':
      return { ...state, ctx: action.ctx };
    case 'SET_ACTIVE_PHASE':
      return { ...state, activePhase: action.phase };
    case 'SET_PHASE':
      return { ...state, phases: { ...state.phases, [action.phase]: action.status } };
    case 'SET_ERROR':
      return { ...state, error: action.error, screen: 'error' };
    case 'ADD_LOG':
      return { ...state, logs: [...state.logs.slice(-99), action.line] };
    case 'CLEAR_LOGS':
      return { ...state, logs: [] };
    default:
      return state;
  }
}
