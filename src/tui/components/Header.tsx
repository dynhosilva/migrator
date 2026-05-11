import React from 'react';
import { Box, Text } from 'ink';
import { theme } from '../theme';

interface HeaderProps {
  readonly subtitle?: string;
}

export function Header({ subtitle }: HeaderProps): React.ReactElement {
  return (
    <Box flexDirection="column" marginBottom={1}>
      <Box>
        <Text color={theme.colors.primary} bold>
          {'◆ lovable-migrate'}
        </Text>
        {subtitle && (
          <Text color={theme.colors.muted}>{' — '}{subtitle}</Text>
        )}
      </Box>
      <Text color={theme.colors.muted}>{'─'.repeat(50)}</Text>
    </Box>
  );
}
