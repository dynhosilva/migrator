import React from 'react';
import { Box, Text, useInput } from 'ink';
import fs   from 'fs';
import path from 'path';
import { Header }      from '../components/Header';
import { StatusBadge } from '../components/StatusBadge';
import { LogViewer }   from '../components/LogViewer';
import { theme }       from '../theme';
import type { ExecutionState } from '../../executor/types';
import type { Navigation }     from '../hooks/useNavigation';

interface DryRunReviewProps {
  readonly execution: ExecutionState;
  readonly outputDir: string;
  readonly nav:       Navigation;
  readonly onNext:    () => void;
}

export function DryRunReview({
  execution,
  outputDir,
  nav,
  onNext,
}: DryRunReviewProps): React.ReactElement {
  const dryRunPath = path.join(outputDir, 'execution', 'dry-run.md');
  const dryRunLines = React.useMemo(() => {
    if (!fs.existsSync(dryRunPath)) return ['(dry-run.md não encontrado)'];
    return fs.readFileSync(dryRunPath, 'utf-8').split('\n').slice(0, 20);
  }, [dryRunPath]);

  const readiness = execution.summary.readiness;
  const badgeVariant = readiness === 'ready' ? 'success'
    : readiness === 'ready-with-warnings' ? 'warning'
    : 'error';

  useInput((input, key) => {
    if (key.escape) nav.goTo('validate-review');
    if (key.return || input === 'n') onNext();
  });

  return (
    <Box flexDirection="column" padding={1}>
      <Header subtitle="Dry-run review" />

      <Box marginBottom={1}>
        <StatusBadge variant={badgeVariant} label={`Prontidão: ${readiness}`} />
      </Box>

      <Box flexDirection="column" marginBottom={1}>
        <Text bold color={theme.colors.white}>
          Plano de execução ({execution.plan.steps.length} passos)
        </Text>
        {execution.plan.steps.slice(0, 6).map((step, i) => (
          <Text key={i} color={theme.colors.muted}>
            {'  '}{i + 1}. {step.description}
          </Text>
        ))}
      </Box>

      <LogViewer logs={dryRunLines} title="dry-run.md (preview)" maxRows={8} />

      <Box marginTop={1}>
        <Text color={theme.colors.muted}>
          Enter/n: próximo passo   Esc: voltar
        </Text>
      </Box>
    </Box>
  );
}
