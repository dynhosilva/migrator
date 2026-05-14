import React from 'react';
import { Box, Text, useApp, useInput } from 'ink';
import { Header } from '../../../tui/components/Header';
import { theme } from '../../../tui/theme';
import type { SyncResult } from '../../types';

interface Props {
  result: SyncResult;
}

export function SyncReport({ result }: Props) {
  const { exit } = useApp();

  useInput((_input, key) => {
    if (key.return || key.escape) exit();
  });

  const { plan } = result;
  const suspiciousCount = plan.userMappings.filter(m => m.confidence.level === 'suspicious').length;

  return (
    <Box flexDirection="column" padding={1}>
      <Header subtitle={result.dryRun ? 'Dry Run Concluído' : result.success ? 'Migração Concluída' : 'Migração com Erros'} />

      <Box flexDirection="column" marginLeft={2} marginTop={1}>

        {/* Status */}
        {result.dryRun ? (
          <Text color={theme.colors.warning} bold>
            {theme.symbols.warn}  DRY RUN — nenhum dado foi alterado
          </Text>
        ) : result.success ? (
          <Text color={theme.colors.success} bold>
            {theme.symbols.check}  Migração concluída com sucesso!
          </Text>
        ) : (
          <Text color={theme.colors.error} bold>
            {theme.symbols.cross}  Migração encerrada com erros
            {result.rollbackPerformed ? ' — rollback executado' : ''}
          </Text>
        )}

        {/* Stats */}
        <Box flexDirection="column" marginTop={1}>
          {result.dryRun ? (
            <Text color={theme.colors.muted}>
              {theme.symbols.arrow} {plan.estimatedTotalUpdates.toLocaleString()} registro(s) seriam atualizados
            </Text>
          ) : (
            <Text color={theme.colors.muted}>
              {theme.symbols.check} {result.totalRowsUpdated.toLocaleString()} registro(s) atualizados em {result.tablesUpdated.length} tabela(s)
            </Text>
          )}
          <Text color={theme.colors.muted}>
            {theme.symbols.arrow} {plan.userMappings.length} usuário(s) mapeados
            {suspiciousCount > 0 ? `, ${suspiciousCount} suspeito(s)` : ''}
          </Text>
          <Text color={theme.colors.muted}>
            {theme.symbols.arrow} Executado em {(result.durationMs / 1000).toFixed(1)}s
          </Text>
        </Box>

        {/* Files */}
        {result.backupFile && (
          <Box flexDirection="column" marginTop={1}>
            <Text color={theme.colors.muted} dimColor>Backup (rollback):  {result.backupFile}</Text>
          </Box>
        )}
        {result.htmlReportFile && (
          <Box flexDirection="column">
            <Text color={theme.colors.primary}>Relatório HTML:     {result.htmlReportFile}</Text>
          </Box>
        )}

        {/* Warnings */}
        {plan.warnings.length > 0 && (
          <Box flexDirection="column" marginTop={1}>
            <Text color={theme.colors.warning} bold>Avisos ({plan.warnings.length}):</Text>
            {plan.warnings.slice(0, 5).map((w, i) => (
              <Text key={i} color={theme.colors.muted} dimColor>  {theme.symbols.dot} {w}</Text>
            ))}
            {plan.warnings.length > 5 && (
              <Text color={theme.colors.muted} dimColor>  … e mais {plan.warnings.length - 5}</Text>
            )}
          </Box>
        )}

        {/* Errors */}
        {result.errors.length > 0 && (
          <Box flexDirection="column" marginTop={1}>
            <Text color={theme.colors.error} bold>Erros:</Text>
            {result.errors.map((e, i) => (
              <Text key={i} color={theme.colors.error}>  {theme.symbols.cross} {e}</Text>
            ))}
          </Box>
        )}
      </Box>

      <Box marginLeft={2} marginTop={2}>
        <Text color={theme.colors.muted}>Enter / Esc: sair</Text>
      </Box>
    </Box>
  );
}
