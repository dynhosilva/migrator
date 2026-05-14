import type { SyncWizardAction, SyncWizardSession } from '../state/types';
import { buildUserSyncPlan, executeSyncPlan } from '../../index';
import { sanitizeError } from '../../utils/mask';

function toErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === 'string') return err;
  return `Erro inesperado: ${String(err)}`;
}

export function useSyncOp(dispatch: React.Dispatch<SyncWizardAction>) {
  async function discover(session: SyncWizardSession): Promise<boolean> {
    const { validateConfig } = await import('../../index');
    const configResult = validateConfig({
      oldSupabase: { url: session.oldUrl, serviceKey: session.oldKey },
      newSupabase: { url: session.newUrl, serviceKey: session.newKey },
      options: { dryRun: false, batchSize: 500, skipTables: [], skipColumns: [], extraColumns: [], verbose: false },
    });
    if (!configResult.valid) {
      dispatch({ type: 'SET_ERROR', error: configResult.errors.join('\n\n') });
      return false;
    }

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
          concurrency: 10,
        },
        onProgress: (msg) => dispatch({ type: 'ADD_LOG', message: msg }),
      });
      dispatch({ type: 'SET_PLAN', plan });
      dispatch({ type: 'SET_SCREEN', screen: 'sync-preview' });
      return true;
    } catch (err) {
      dispatch({ type: 'SET_ERROR', error: sanitizeError(err) });
      return false;
    } finally {
      dispatch({ type: 'SET_DISCOVERING', value: false });
    }
  }

  async function execute(session: SyncWizardSession): Promise<boolean> {
    if (!session.plan) {
      dispatch({ type: 'SET_ERROR', error: 'Plano de sincronização não encontrado. Volte e tente descobrir novamente.' });
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
          concurrency: 10,
        },
        onProgress: (msg) => dispatch({ type: 'ADD_LOG', message: msg }),
      });
      dispatch({ type: 'SET_RESULT', result });
      dispatch({ type: 'SET_SCREEN', screen: 'sync-report' });
      return true;
    } catch (err) {
      dispatch({ type: 'SET_ERROR', error: sanitizeError(err) });
      return false;
    } finally {
      dispatch({ type: 'SET_EXECUTING', value: false });
    }
  }

  return { discover, execute };
}

// re-exported for tests
export { toErrorMessage };
