import React from 'react';
import { tuiReducer, INITIAL_SESSION } from '../state/reducer';
import type { TuiSession, TuiAction } from '../state/types';

export function useSession(): [TuiSession, React.Dispatch<TuiAction>] {
  return React.useReducer(tuiReducer, INITIAL_SESSION);
}
