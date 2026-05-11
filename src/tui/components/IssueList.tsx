import React from 'react';
import { Box, Text } from 'ink';
import { theme } from '../theme';

export interface Issue {
  readonly code:       string;
  readonly message:    string;
  readonly severity:   'critical' | 'warning' | 'info';
  readonly suggestion?: string;
}

interface IssueListProps {
  readonly issues:  Issue[];
  readonly title?:  string;
  readonly limit?:  number;
}

const SEVERITY_COLOR = {
  critical: theme.colors.error,
  warning:  theme.colors.warning,
  info:     theme.colors.info,
} as const;

const SEVERITY_LABEL = {
  critical: 'CRÍTICO',
  warning:  'AVISO',
  info:     'INFO',
} as const;

export function IssueList({ issues, title, limit }: IssueListProps): React.ReactElement {
  const shown = limit ? issues.slice(0, limit) : issues;
  const rest  = limit ? issues.length - limit  : 0;

  return (
    <Box flexDirection="column">
      {title && <Text bold color={theme.colors.white}>{title}</Text>}
      {shown.length === 0 && (
        <Text color={theme.colors.muted}>  {theme.symbols.check} Nenhum issue</Text>
      )}
      {shown.map((issue) => (
        <Box key={issue.code} flexDirection="column" marginLeft={2}>
          <Box>
            <Text color={SEVERITY_COLOR[issue.severity] as Parameters<typeof Text>[0]['color']} bold>
              [{SEVERITY_LABEL[issue.severity]}]
            </Text>
            <Text>{' '}{issue.message}</Text>
          </Box>
          {issue.suggestion && (
            <Text color={theme.colors.muted}>
              {'  '}{theme.symbols.arrow} {issue.suggestion}
            </Text>
          )}
        </Box>
      ))}
      {rest > 0 && (
        <Box marginLeft={2}>
          <Text color={theme.colors.muted}>
            {theme.symbols.dot} ...e mais {rest} issue(s)
          </Text>
        </Box>
      )}
    </Box>
  );
}
