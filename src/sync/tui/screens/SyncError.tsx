import React from 'react';
import { Box, Text, useApp, useInput } from 'ink';
import { Header } from '../../../tui/components/Header';
import { theme } from '../../../tui/theme';
import type { SyncNavigation } from '../hooks/useSyncNav';

interface Props {
  nav: SyncNavigation;
  error: string;
}

export function SyncError({ nav, error }: Props) {
  const { exit } = useApp();

  useInput((input, key) => {
    if (input === 'r' || input === 'R') nav.goTo('sync-welcome');
    if (key.escape || input === 'q') exit();
  });

  return (
    <Box flexDirection="column" padding={1}>
      <Header subtitle="Erro" />

      <Box
        flexDirection="column"
        marginLeft={2}
        marginTop={1}
        borderStyle="round"
        borderColor={theme.colors.error as 'red'}
        padding={1}
      >
        <Text color={theme.colors.error} bold>{theme.symbols.cross}  Erro durante a sincronização</Text>
        <Text color={theme.colors.muted} wrap="wrap">{error}</Text>
      </Box>

      <Box marginLeft={2} marginTop={2}>
        <Text color={theme.colors.muted}>r: reiniciar do início  ·  Esc: sair</Text>
      </Box>
    </Box>
  );
}
