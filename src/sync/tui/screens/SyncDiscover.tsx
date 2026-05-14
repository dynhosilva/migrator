import React from 'react';
import { Box, Text } from 'ink';
import { Header } from '../../../tui/components/Header';
import { Spinner } from '../../../tui/components/Spinner';
import { theme } from '../../../tui/theme';

interface Props {
  progressLog: string[];
}

export function SyncDiscover({ progressLog }: Props) {
  const recent = progressLog.slice(-6);

  return (
    <Box flexDirection="column" padding={1}>
      <Header subtitle="Passo 2/4 — Detectando Schema e Usuários" />

      <Box flexDirection="column" marginLeft={2} marginTop={1}>
        <Spinner label="Analisando projeto..." />

        {recent.length > 0 && (
          <Box flexDirection="column" marginTop={1}>
            {recent.map((msg, i) => (
              <Text key={i} color={theme.colors.muted} dimColor>
                {theme.symbols.arrow} {msg}
              </Text>
            ))}
          </Box>
        )}
      </Box>
    </Box>
  );
}
