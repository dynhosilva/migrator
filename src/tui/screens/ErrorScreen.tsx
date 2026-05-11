import React from 'react';
import { Box, Text, useInput } from 'ink';
import { Header }      from '../components/Header';
import { StatusBadge } from '../components/StatusBadge';
import { theme }       from '../theme';
import type { Navigation } from '../hooks/useNavigation';

interface ErrorScreenProps {
  readonly message: string;
  readonly nav:     Navigation;
}

export function ErrorScreen({ message, nav }: ErrorScreenProps): React.ReactElement {
  useInput((input, key) => {
    if (key.return || input === 'r') nav.goTo('welcome');
    if (input === 'q' || key.escape)  process.exit(1);
  });

  return (
    <Box flexDirection="column" padding={1}>
      <Header subtitle="Erro" />

      <Box marginBottom={1}>
        <StatusBadge variant="error" label="Falha no pipeline" />
      </Box>

      <Box flexDirection="column" marginBottom={2} borderStyle="single" borderColor="red" paddingX={1}>
        <Text color={theme.colors.error}>{message}</Text>
      </Box>

      <Text color={theme.colors.muted}>
        r/Enter: reiniciar   q/Esc: sair
      </Text>
    </Box>
  );
}
