import type { SyncPlan, SyncResult } from '../../types';

export type SyncScreen =
  | 'sync-welcome'
  | 'sync-connect'
  | 'sync-discover'
  | 'sync-preview'
  | 'sync-confirm'
  | 'sync-progress'
  | 'sync-report'
  | 'sync-error';

export interface SyncWizardSession {
  readonly screen: SyncScreen;
  readonly oldUrl: string;
  readonly oldKey: string;
  readonly newUrl: string;
  readonly newKey: string;
  readonly dryRun: boolean;
  readonly plan: SyncPlan | null;
  readonly result: SyncResult | null;
  readonly discovering: boolean;
  readonly executing: boolean;
  readonly progressLog: string[];
  readonly error: string | null;
  readonly oldAuthMode: 'service-key' | 'json-export';
  readonly oldAuthExport: string;  // file path or export URL
}

export type SyncWizardAction =
  | { type: 'SET_SCREEN'; screen: SyncScreen }
  | { type: 'SET_OLD_URL'; value: string }
  | { type: 'SET_OLD_KEY'; value: string }
  | { type: 'SET_NEW_URL'; value: string }
  | { type: 'SET_NEW_KEY'; value: string }
  | { type: 'SET_DRY_RUN'; value: boolean }
  | { type: 'SET_DISCOVERING'; value: boolean }
  | { type: 'SET_EXECUTING'; value: boolean }
  | { type: 'SET_PLAN'; plan: SyncPlan }
  | { type: 'SET_RESULT'; result: SyncResult }
  | { type: 'ADD_LOG'; message: string }
  | { type: 'CLEAR_LOGS' }
  | { type: 'SET_ERROR'; error: string }
  | { type: 'SET_OLD_AUTH_MODE'; value: 'service-key' | 'json-export' }
  | { type: 'SET_OLD_AUTH_EXPORT'; value: string };
