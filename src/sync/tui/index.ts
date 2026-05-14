import React from 'react';
import { render } from 'ink';
import { SyncApp } from './app';

export function startSyncWizard(): void {
  render(React.createElement(SyncApp));
}
