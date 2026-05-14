import React from 'react';
import { Box, Text, useInput } from 'ink';
import { Header } from '../../../tui/components/Header';
import { theme } from '../../../tui/theme';
import type { SyncPlan } from '../../types';
import type { SyncNavigation } from '../hooks/useSyncNav';

interface Props {
  nav: SyncNavigation;
  plan: SyncPlan;
  dryRun: boolean;
  onConfirm: () => void;
}

export function SyncConfirm({ nav, plan, dryRun, onConfirm }: Props) {
  const suspiciousUsers = plan.userMappings.filter(m => m.confidence.level === 'suspicious');

  useInput((input, key) => {
    if (key.escape) nav.goTo('sync-preview');
    if (input === 's' || input === 'S') onConfirm();
    if (input === 'n' || input === 'N') nav.goTo('sync-preview');
  });

  return (
    <Box flexDirection="column" padding={1}>
      <Header subtitle={dryRun ? 'Passo 4/4 — Confirmar Dry Run' : 'Passo 4/4 — Confirmar Migração'} />

      <Box flexDirection="column" marginLeft={2} marginTop={1}>
        {dryRun ? (
          <Text color={theme.colors.warning} bold>
            {theme.symbols.warn}  Modo DRY RUN — nenhum dado será alterado
          </Text>
        ) : (
          <Text color={theme.colors.warning} bold>
            {theme.symbols.warn}  Esta operação vai modificar dados no banco de dados
          </Text>
        )}

        <Box flexDirection="column" marginTop={1}>
          <Text color={theme.colors.muted}>  {theme.symbols.arrow} {plan.userMappings.length} usuário(s) a reconectar</Text>
          <Text color={theme.colors.muted}>  {theme.symbols.arrow} {plan.estimatedTotalUpdates.toLocaleString()} registro(s) estimados</Text>
          {!dryRun && (
            <Text color={theme.colors.muted}>  {theme.symbols.arrow} Backup automático criado antes de qualquer alteração</Text>
          )}
          {!dryRun && (
            <Text color={theme.colors.muted}>  {theme.symbols.arrow} Rollback automático em caso de erro</Text>
          )}
        </Box>

        {suspiciousUsers.length > 0 && (
          <Box flexDirection="column" marginTop={1}>
            <Text color={theme.colors.error} bold>Matches com confiança SUSPEITA ({suspiciousUsers.length}):</Text>
            {suspiciousUsers.map((m, i) => (
              <Box key={i} flexDirection="column" marginLeft={2}>
                <Text color={theme.colors.error}>{theme.symbols.warn} {m.email}</Text>
                {m.confidence.reasons.map((r, j) => (
                  <Text key={j} color={theme.colors.muted} dimColor>    {theme.symbols.dot} {r}</Text>
                ))}
              </Box>
            ))}
          </Box>
        )}
      </Box>

      <Box marginLeft={2} marginTop={2}>
        <Text color={theme.colors.muted}>
          s: confirmar  ·  n: cancelar  ·  Esc: voltar ao preview
        </Text>
      </Box>
    </Box>
  );
}
