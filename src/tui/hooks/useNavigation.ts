import React from 'react';
import type { Screen, TuiAction } from '../state/types';

export interface Navigation {
  goTo:      (screen: Screen) => void;
  goToError: (msg: string)    => void;
}

export function useNavigation(dispatch: React.Dispatch<TuiAction>): Navigation {
  return React.useMemo(() => ({
    goTo:      (screen: Screen) => dispatch({ type: 'SET_SCREEN', screen }),
    goToError: (msg: string)    => dispatch({ type: 'SET_ERROR',  error: msg }),
  }), [dispatch]);
}
