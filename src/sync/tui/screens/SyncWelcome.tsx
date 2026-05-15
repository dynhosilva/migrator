import React from 'react';
import { Box, Text, useInput } from 'ink';
import { Header } from '../../../tui/components/Header';
import { theme } from '../../../tui/theme';
import type { SyncNavigation } from '../hooks/useSyncNav';

interface Props {
  nav: SyncNavigation;
}

export function SyncWelcome({ nav }: Props) {
  useInput((_input, key) => {
    if (key.return) nav.goTo('sync-connect');
    if (key.escape) process.exit(0);
  });

  return (
    <Box flexDirection="column" padding={1}>
      <Header subtitle="Reconexão de Dados — Supabase" />

      <Box flexDirection="column" marginLeft={2} marginTop={1}>
        <Text color={theme.colors.white}>
          Após migrar para um novo Supabase, os usuários que criam conta
          recebem um UUID diferente — seus dados ficam desconectados.
        </Text>
        <Text color={theme.colors.white}> </Text>
        <Text color={theme.colors.primary} bold>Este wizard faz automaticamente:</Text>

        <Box flexDirection="column" marginLeft={2} marginTop={1}>
          <Text color={theme.colors.muted}>{theme.symbols.check} Detecta todas as tabelas com colunas user_id, profile_id, owner_id, etc.</Text>
          <Text color={theme.colors.muted}>{theme.symbols.check} Cruza usuários por email entre os dois projetos</Text>
          <Text color={theme.colors.muted}>{theme.symbols.check} Mostra preview completo com score de confiança</Text>
          <Text color={theme.colors.muted}>{theme.symbols.check} Executa com backup automático e rollback em caso de erro</Text>
          <Text color={theme.colors.muted}>{theme.symbols.check} Gera relatório HTML detalhado</Text>
        </Box>

        <Box flexDirection="column" marginTop={1}>
          <Text color={theme.colors.warning}>{theme.symbols.warn}  Necessário:</Text>
          <Box marginLeft={2} flexDirection="column">
            <Text color={theme.colors.muted}>{theme.symbols.check} Service Role Key do projeto NOVO</Text>
            <Text color={theme.colors.muted}>○ Service Role Key do projeto ANTIGO  OU  arquivo export JSON dos usuários</Text>
          </Box>
        </Box>
      </Box>

      <Box marginLeft={2} marginTop={2}>
        <Text color={theme.colors.muted}>Enter: começar  ·  Esc: sair</Text>
      </Box>
    </Box>
  );
}
