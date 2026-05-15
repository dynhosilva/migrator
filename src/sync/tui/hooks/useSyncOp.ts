import type { SyncWizardAction, SyncWizardSession } from '../state/types';
import { buildUserSyncPlan, executeSyncPlan } from '../../index';
import type { SyncConfig, OldProjectSource } from '../../index';
import { sanitizeError } from '../../utils/mask';

function toErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === 'string') return err;
  return `Erro inesperado: ${String(err)}`;
}

function buildOldSource(session: SyncWizardSession): OldProjectSource | undefined {
  if (session.oldAuthMode === 'json-export') {
    const export_ = session.oldAuthExport.trim();
    if (export_.startsWith('http://') || export_.startsWith('https://')) {
      return {
        kind: 'json-url',
        exportUrl: export_,
        url: session.oldUrl.trim() || undefined,
      };
    }
    return {
      kind: 'json-file',
      filePath: export_,
      url: session.oldUrl.trim() || undefined,
    };
  }
  // service-key mode — use oldSupabase for backward compat
  return undefined;
}

function buildSyncConfig(session: SyncWizardSession, dryRun: boolean): SyncConfig {
  const oldSource = buildOldSource(session);
  const base: SyncConfig = {
    newSupabase: { url: session.newUrl, serviceKey: session.newKey },
    options: {
      dryRun,
      batchSize: 500,
      skipTables: [],
      skipColumns: [],
      extraColumns: [],
      verbose: false,
      concurrency: 10,
    },
  };

  if (oldSource) {
    return { ...base, oldSource };
  }
  return {
    ...base,
    oldSupabase: { url: session.oldUrl, serviceKey: session.oldKey },
  };
}

export function useSyncOp(dispatch: React.Dispatch<SyncWizardAction>) {
  async function discover(session: SyncWizardSession): Promise<boolean> {
    const { validateConfig } = await import('../../index');
    const config = buildSyncConfig(session, false);
    const configResult = validateConfig(config);
    if (!configResult.valid) {
      dispatch({ type: 'SET_ERROR', error: configResult.errors.join('\n\n') });
      return false;
    }

    dispatch({ type: 'SET_DISCOVERING', value: true });
    dispatch({ type: 'CLEAR_LOGS' });

    try {
      const plan = await buildUserSyncPlan({
        ...config,
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
      const config = buildSyncConfig(session, session.dryRun);
      const result = await executeSyncPlan(session.plan, {
        ...config,
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
