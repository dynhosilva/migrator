import React from 'react';
import { Box, Text } from 'ink';
import { theme } from '../theme';

interface LogViewerProps {
  readonly logs:    string[];
  readonly title?:  string;
  readonly maxRows?: number;
}

export function LogViewer({ logs, title, maxRows = 10 }: LogViewerProps): React.ReactElement {
  const shown = logs.slice(-maxRows);

  return (
    <Box flexDirection="column">
      {title && <Text bold color={theme.colors.white}>{title}</Text>}
      {shown.length === 0 && (
        <Text color={theme.colors.muted}>  (sem logs)</Text>
      )}
      {shown.map((line, i) => (
        <Text key={i} color={theme.colors.muted}>
          {'  '}{line}
        </Text>
      ))}
    </Box>
  );
}
