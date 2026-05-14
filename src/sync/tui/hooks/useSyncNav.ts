import { useMemo } from 'react';
import type { SyncScreen, SyncWizardAction } from '../state/types';

export interface SyncNavigation {
  goTo: (screen: SyncScreen) => void;
  goToError: (msg: string) => void;
}

export function useSyncNav(dispatch: React.Dispatch<SyncWizardAction>): SyncNavigation {
  return useMemo(() => ({
    goTo: (screen: SyncScreen) => dispatch({ type: 'SET_SCREEN', screen }),
    goToError: (error: string) => dispatch({ type: 'SET_ERROR', error }),
  }), [dispatch]);
}
