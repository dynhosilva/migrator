import type { SyncWizardSession, SyncWizardAction } from './types';

export const INITIAL_SYNC_SESSION: SyncWizardSession = {
  screen: 'sync-welcome',
  oldUrl: '',
  oldKey: '',
  newUrl: '',
  newKey: '',
  dryRun: false,
  plan: null,
  result: null,
  discovering: false,
  executing: false,
  progressLog: [],
  error: null,
};

export function syncWizardReducer(
  state: SyncWizardSession,
  action: SyncWizardAction,
): SyncWizardSession {
  switch (action.type) {
    case 'SET_SCREEN':     return { ...state, screen: action.screen };
    case 'SET_OLD_URL':    return { ...state, oldUrl: action.value };
    case 'SET_OLD_KEY':    return { ...state, oldKey: action.value };
    case 'SET_NEW_URL':    return { ...state, newUrl: action.value };
    case 'SET_NEW_KEY':    return { ...state, newKey: action.value };
    case 'SET_DRY_RUN':   return { ...state, dryRun: action.value };
    case 'SET_DISCOVERING': return { ...state, discovering: action.value };
    case 'SET_EXECUTING':  return { ...state, executing: action.value };
    case 'SET_PLAN':       return { ...state, plan: action.plan };
    case 'SET_RESULT':     return { ...state, result: action.result };
    case 'ADD_LOG':        return { ...state, progressLog: [...state.progressLog, action.message] };
    case 'CLEAR_LOGS':     return { ...state, progressLog: [] };
    case 'SET_ERROR':
      return { ...state, error: action.error, screen: 'sync-error', executing: false, discovering: false };
    default:               return state;
  }
}
