import React, { useReducer, useCallback } from 'react';
import { Box } from 'ink';
import { syncWizardReducer, INITIAL_SYNC_SESSION } from './state/reducer';
import { useSyncNav } from './hooks/useSyncNav';
import { useSyncOp } from './hooks/useSyncOp';
import { SyncWelcome } from './screens/SyncWelcome';
import { SyncConnect } from './screens/SyncConnect';
import { SyncDiscover } from './screens/SyncDiscover';
import { SyncPreview } from './screens/SyncPreview';
import { SyncConfirm } from './screens/SyncConfirm';
import { SyncProgress } from './screens/SyncProgress';
import { SyncReport } from './screens/SyncReport';
import { SyncError } from './screens/SyncError';

export function SyncApp() {
  const [session, dispatch] = useReducer(syncWizardReducer, INITIAL_SYNC_SESSION);
  const nav = useSyncNav(dispatch);
  const op = useSyncOp(dispatch);

  const handleConnectSubmit = useCallback(() => {
    nav.goTo('sync-discover');
    op.discover(session);
  }, [nav, op, session]);

  const handlePreviewConfirm = useCallback(() => {
    nav.goTo('sync-confirm');
  }, [nav]);

  const handleConfirmSubmit = useCallback(() => {
    nav.goTo('sync-progress');
    op.execute(session);
  }, [nav, op, session]);

  const { screen } = session;

  return (
    <Box>
      {screen === 'sync-welcome'  && <SyncWelcome nav={nav} />}
      {screen === 'sync-connect'  && (
        <SyncConnect
          nav={nav}
          session={session}
          dispatch={dispatch}
          onSubmit={handleConnectSubmit}
        />
      )}
      {screen === 'sync-discover' && <SyncDiscover progressLog={session.progressLog} />}
      {screen === 'sync-preview'  && session.plan && (
        <SyncPreview
          nav={nav}
          plan={session.plan}
          dispatch={dispatch}
          onConfirm={handlePreviewConfirm}
        />
      )}
      {screen === 'sync-confirm'  && session.plan && (
        <SyncConfirm
          nav={nav}
          plan={session.plan}
          dryRun={session.dryRun}
          onConfirm={handleConfirmSubmit}
        />
      )}
      {screen === 'sync-progress' && (
        <SyncProgress progressLog={session.progressLog} dryRun={session.dryRun} />
      )}
      {screen === 'sync-report'   && session.result && (
        <SyncReport result={session.result} />
      )}
      {screen === 'sync-error'    && (
        <SyncError nav={nav} error={session.error ?? 'Erro desconhecido'} />
      )}
    </Box>
  );
}
