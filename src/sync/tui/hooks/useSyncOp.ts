import type { SyncWizardAction, SyncWizardSession } from '../state/types';
import { buildUserSyncPlan, executeSyncPlan } from '../../index';

export function useSyncOp(dispatch: React.Dispatch<SyncWizardAction>) {
  async function discover(session: SyncWizardSession): Promise<boolean> {
    dispatch({ type: 'SET_DISCOVERING', value: true });
    dispatch({ type: 'CLEAR_LOGS' });

    try {
      const plan = await buildUserSyncPlan({
        oldSupabase: { url: session.oldUrl, serviceKey: session.oldKey },
        newSupabase: { url: session.newUrl, serviceKey: session.newKey },
        options: {
          dryRun: false,
          batchSize: 500,
          skipTables: [],
          skipColumns: [],
          extraColumns: [],
          verbose: false,
        },
        onProgress: (msg) => dispatch({ type: 'ADD_LOG', message: msg }),
      });
      dispatch({ type: 'SET_PLAN', plan });
      dispatch({ type: 'SET_SCREEN', screen: 'sync-preview' });
      return true;
    } catch (err) {
      dispatch({ type: 'SET_ERROR', error: (err as Error).message });
      return false;
    } finally {
      dispatch({ type: 'SET_DISCOVERING', value: false });
    }
  }

  async function execute(session: SyncWizardSession): Promise<boolean> {
    if (!session.plan) {
      dispatch({ type: 'SET_ERROR', error: 'Plano de sincronização não encontrado' });
      return false;
    }
    dispatch({ type: 'SET_EXECUTING', value: true });
    dispatch({ type: 'CLEAR_LOGS' });

    try {
      const result = await executeSyncPlan(session.plan, {
        oldSupabase: { url: session.oldUrl, serviceKey: session.oldKey },
        newSupabase: { url: session.newUrl, serviceKey: session.newKey },
        options: {
          dryRun: session.dryRun,
          batchSize: 500,
          skipTables: [],
          skipColumns: [],
          extraColumns: [],
          verbose: false,
        },
        onProgress: (msg) => dispatch({ type: 'ADD_LOG', message: msg }),
      });
      dispatch({ type: 'SET_RESULT', result });
      dispatch({ type: 'SET_SCREEN', screen: 'sync-report' });
      return true;
    } catch (err) {
      dispatch({ type: 'SET_ERROR', error: (err as Error).message });
      return false;
    } finally {
      dispatch({ type: 'SET_EXECUTING', value: false });
    }
  }

  return { discover, execute };
}
