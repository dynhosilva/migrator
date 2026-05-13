import React from 'react';
import { Box, Text, useInput } from 'ink';
import { Header }      from '../components/Header';
import { StatusBadge } from '../components/StatusBadge';
import { theme }       from '../theme';
import type { ProjectContext } from '../../core/types';
import type { Navigation }    from '../hooks/useNavigation';

interface SummaryProps {
  readonly ctx:       ProjectContext;
  readonly outputDir: string;
  readonly nav:       Navigation;
}

export function Summary({ ctx, outputDir, nav }: SummaryProps): React.ReactElement {
  useInput((input, key) => {
    if (input === 'a') nav.goTo('artifact-browser');
    if (key.escape || input === 'q') process.exit(0);
  });

  const migration = ctx.migration;
  const deploy    = ctx.deploy;
  const execution = ctx.execution;
  const remote    = ctx.remote;

  return (
    <Box flexDirection="column" padding={1}>
      <Header subtitle="Concluído" />

      <Box marginBottom={1}>
        <StatusBadge variant="success" label="Pipeline executado com sucesso" />
      </Box>

      <Box flexDirection="column" marginBottom={1}>
        <Text bold color={theme.colors.white}>Resumo de artefatos gerados:</Text>
        {migration && (
          <Text color={theme.colors.muted}>
            {'  '}{theme.symbols.check} Migração: {migration.report.totalFilesGenerated} {migration.report.totalFilesGenerated === 1 ? 'arquivo' : 'arquivos'}
          </Text>
        )}
        {deploy && (
          <Text color={theme.colors.muted}>
            {'  '}{theme.symbols.check} Docker: {deploy.report.totalFilesGenerated} {deploy.report.totalFilesGenerated === 1 ? 'arquivo' : 'arquivos'}
          </Text>
        )}
        {execution && (
          <Text color={theme.colors.muted}>
            {'  '}{theme.symbols.check} Execução: {execution.plan.steps.length} {execution.plan.steps.length === 1 ? 'passo planejado' : 'passos planejados'}
          </Text>
        )}
        {remote && (
          <Text color={theme.colors.muted}>
            {'  '}{theme.symbols.check} Remote: {remote.transferPlan.files.length} {remote.transferPlan.files.length === 1 ? 'arquivo a transferir' : 'arquivos a transferir'}
          </Text>
        )}
      </Box>

      <Box flexDirection="column" marginBottom={1}>
        <Text bold color={theme.colors.white}>Saída:</Text>
        <Text color={theme.colors.primary}>{'  '}{outputDir}</Text>
      </Box>

      <Box>
        <Text color={theme.colors.muted}>
          a: navegar artefatos   q/Esc: sair
        </Text>
      </Box>
    </Box>
  );
}
