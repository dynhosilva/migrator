import React from 'react';
import { render } from 'ink';
import { App }    from './app';

export interface TuiOptions {
  readonly inputPath?: string;
  readonly outputDir?: string;
}

export function startTui(_opts: TuiOptions = {}): void {
  render(React.createElement(App));
}
