import React from 'react';
import { Box, Text, useInput } from 'ink';
import { Header } from '../../../tui/components/Header';
import { theme } from '../../../tui/theme';
import type { SyncPlan, ConfidenceLevel } from '../../types';
import type { SyncNavigation } from '../hooks/useSyncNav';
import type { SyncWizardAction } from '../state/types';

const CONFIDENCE_DISPLAY: Record<ConfidenceLevel, { symbol: string; color: string; label: string }> = {
  high:       { symbol: '●', color: 'green',  label: 'ALTA'     },
  medium:     { symbol: '◐', color: 'yellow', label: 'MÉDIA'    },
  suspicious: { symbol: '⚠', color: 'red',    label: 'SUSPEITA' },
};

interface Props {
  nav: SyncNavigation;
  plan: SyncPlan;
  dispatch: React.Dispatch<SyncWizardAction>;
  onConfirm: () => void;
}

export function SyncPreview({ nav, plan, dispatch, onConfirm }: Props) {
  const suspiciousCount = plan.userMappings.filter(m => m.confidence.level === 'suspicious').length;
  const activeColumns = plan.columnTargets.filter(c => c.estimatedRows > 0);
  const maxUsers = 8;
  const maxCols = 6;

  useInput((_input, key) => {
    if (key.escape) nav.goTo('sync-connect');
    if (key.return) onConfirm();
    if (_input === 'd') {
      dispatch({ type: 'SET_DRY_RUN', value: true });
      onConfirm();
    }
  });

  return (
    <Box flexDirection="column" padding={1}>
      <Header subtitle="Passo 3/4 — Preview da Migração" />

      <Box flexDirection="column" marginLeft={2} marginTop={1}>

        {/* Summary */}
        <Box marginBottom={1}>
          <Box flexDirection="column" marginRight={4}>
            <Text color={theme.colors.muted} dimColor>Usuários mapeados</Text>
            <Text color={theme.colors.white} bold>{plan.userMappings.length}</Text>
          </Box>
          <Box flexDirection="column" marginRight={4}>
            <Text color={theme.colors.muted} dimColor>Colunas afetadas</Text>
            <Text color={theme.colors.white} bold>{activeColumns.length}</Text>
          </Box>
          <Box flexDirection="column" marginRight={4}>
            <Text color={theme.colors.muted} dimColor>Total de registros</Text>
            <Text color={plan.estimatedTotalUpdates > 0 ? theme.colors.primary : theme.colors.muted} bold>
              {plan.estimatedTotalUpdates.toLocaleString()}
            </Text>
          </Box>
          {suspiciousCount > 0 && (
            <Box flexDirection="column">
              <Text color={theme.colors.muted} dimColor>Matches suspeitos</Text>
              <Text color={theme.colors.error} bold>{suspiciousCount}</Text>
            </Box>
          )}
        </Box>

        {/* Users table */}
        {plan.userMappings.length > 0 && (
          <Box flexDirection="column" marginBottom={1}>
            <Text color={theme.colors.primary} bold>Usuários</Text>
            <Box flexDirection="column" marginLeft={1}>
              {plan.userMappings.slice(0, maxUsers).map((m, i) => {
                const conf = CONFIDENCE_DISPLAY[m.confidence.level];
                return (
                  <Box key={i}>
                    <Text color={conf.color as 'green' | 'yellow' | 'red'}>{conf.symbol} {conf.label.padEnd(8)}</Text>
                    <Text color={theme.colors.white}>{m.email}</Text>
                    <Text color={theme.colors.muted} dimColor>
                      {m.oldUserId.slice(0, 8)}… {theme.symbols.arrow} {m.newUserId.slice(0, 8)}…
                    </Text>
                  </Box>
                );
              })}
              {plan.userMappings.length > maxUsers && (
                <Text color={theme.colors.muted} dimColor>  … e mais {plan.userMappings.length - maxUsers} usuário(s)</Text>
              )}
            </Box>
          </Box>
        )}

        {/* Columns */}
        {activeColumns.length > 0 && (
          <Box flexDirection="column" marginBottom={1}>
            <Text color={theme.colors.primary} bold>Tabelas e colunas</Text>
            <Box flexDirection="column" marginLeft={1}>
              {activeColumns.slice(0, maxCols).map((c, i) => (
                <Box key={i}>
                  <Text color={theme.colors.white}>{c.tableName}</Text>
                  <Text color={theme.colors.muted}>·</Text>
                  <Text color={theme.colors.muted}>{c.columnName}</Text>
                  <Text color={theme.colors.primary}>{c.estimatedRows.toLocaleString()} registro(s)</Text>
                </Box>
              ))}
              {activeColumns.length > maxCols && (
                <Text color={theme.colors.muted} dimColor>  … e mais {activeColumns.length - maxCols} coluna(s)</Text>
              )}
            </Box>
          </Box>
        )}

        {/* Conflicts */}
        {plan.conflicts.length > 0 && (
          <Box flexDirection="column" marginBottom={1}>
            <Text color={theme.colors.error} bold>
              {theme.symbols.warn}  {plan.conflicts.length} conflito(s) detectado(s) — novo usuário já tem dados
            </Text>
            {plan.conflicts.slice(0, 3).map((c, i) => (
              <Text key={i} color={theme.colors.muted} dimColor>
                {'    '}{c.email}: {c.tableName}.{c.columnName} ({c.existingRowCount} linha(s))
              </Text>
            ))}
            {plan.conflicts.length > 3 && (
              <Text color={theme.colors.muted} dimColor>
                {'    '}… e mais {plan.conflicts.length - 3}
              </Text>
            )}
          </Box>
        )}

        {/* Suspicious confidence */}
        {suspiciousCount > 0 && (
          <Box marginBottom={1}>
            <Text color={theme.colors.warning}>
              {theme.symbols.warn}  {suspiciousCount} match(es) com confiança SUSPEITA — revisar antes de continuar
            </Text>
          </Box>
        )}

        {plan.userMappings.length === 0 && (
          <Text color={theme.colors.error}>
            {theme.symbols.cross}  Nenhum usuário mapeado — verifique se os usuários criaram conta no novo projeto
          </Text>
        )}
      </Box>

      <Box marginLeft={2} marginTop={1}>
        <Text color={theme.colors.muted}>
          Enter: confirmar migração  ·  d: dry-run (preview)  ·  Esc: refazer credenciais
        </Text>
      </Box>
    </Box>
  );
}
