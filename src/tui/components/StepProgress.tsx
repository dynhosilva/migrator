import React from 'react';
import { Box, Text } from 'ink';
import { theme } from '../theme';

export type StepStatus = 'idle' | 'running' | 'done' | 'failed' | 'skipped';

export interface Step {
  readonly key:    string;
  readonly label:  string;
  readonly status: StepStatus;
}

interface StepProgressProps {
  readonly steps: Step[];
}

const STATUS_SYMBOL: Record<StepStatus, string> = {
  idle:    '○',
  running: '●',
  done:    theme.symbols.check,
  failed:  theme.symbols.cross,
  skipped: theme.symbols.dot,
};

const STATUS_COLOR: Record<StepStatus, string> = {
  idle:    theme.colors.muted,
  running: theme.colors.primary,
  done:    theme.colors.success,
  failed:  theme.colors.error,
  skipped: theme.colors.muted,
};

export function StepProgress({ steps }: StepProgressProps): React.ReactElement {
  return (
    <Box flexDirection="column">
      {steps.map((step, idx) => (
        <Box key={step.key}>
          <Text color={theme.colors.muted}>{String(idx + 1).padStart(2, ' ')}. </Text>
          <Text
            color={STATUS_COLOR[step.status] as Parameters<typeof Text>[0]['color']}
            bold={step.status === 'running'}
          >
            {STATUS_SYMBOL[step.status]}
          </Text>
          <Text>{' '}{step.label}</Text>
        </Box>
      ))}
    </Box>
  );
}
