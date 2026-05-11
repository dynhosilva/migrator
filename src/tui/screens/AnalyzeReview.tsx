import React from 'react';
import { Box, Text, useInput } from 'ink';
import { Header }      from '../components/Header';
import { StatusBadge } from '../components/StatusBadge';
import { theme }       from '../theme';
import type { AnalysisReport } from '../../analyzer/types';
import type { Navigation }     from '../hooks/useNavigation';

interface AnalyzeReviewProps {
  readonly analysis: AnalysisReport;
  readonly nav:      Navigation;
  readonly onNext:   () => void;
}

export function AnalyzeReview({ analysis, nav, onNext }: AnalyzeReviewProps): React.ReactElement {
  useInput((input, key) => {
    if (key.escape) nav.goTo('project-select');
    if (key.return || input === 'n') onNext();
  });

  const supabase = analysis.supabase.detected;

  return (
    <Box flexDirection="column" padding={1}>
      <Header subtitle="Resultado da análise" />

      <Box flexDirection="column" marginBottom={1}>
        <Text bold color={theme.colors.white}>Projeto: </Text>
        <Text color={theme.colors.primary}>{analysis.projectName}</Text>
      </Box>

      <Box flexDirection="column" marginBottom={1}>
        <Row label="Framework"        value={analysis.framework}      />
        <Row label="Build system"     value={analysis.buildSystem}    />
        <Row label="Package manager"  value={analysis.packageManager} />
        <Row label="Linguagem"        value={analysis.language.primary} />
        <Row label="Tailwind"         value={analysis.tailwind.detected ? 'Sim' : 'Não'} />
      </Box>

      <Box flexDirection="column" marginBottom={1}>
        <Text bold color={theme.colors.white}>Env vars detectadas ({analysis.envVars.length})</Text>
        {analysis.envVars.length === 0 && (
          <Text color={theme.colors.muted}>  Nenhuma</Text>
        )}
        {analysis.envVars.slice(0, 8).map((v) => (
          <Text key={v} color={theme.colors.muted}>  {theme.symbols.dot} {v}</Text>
        ))}
        {analysis.envVars.length > 8 && (
          <Text color={theme.colors.muted}>  ...e mais {analysis.envVars.length - 8}</Text>
        )}
      </Box>

      <Box marginBottom={1}>
        <StatusBadge
          variant={supabase ? 'info' : 'muted'}
          label={supabase ? `Supabase detectado (${analysis.supabase.migrations.count} migrations)` : 'Sem Supabase'}
        />
      </Box>

      <Text color={theme.colors.muted}>
        Enter/n: próxima fase   Esc: voltar
      </Text>
    </Box>
  );
}

function Row({ label, value }: { label: string; value: string }): React.ReactElement {
  return (
    <Box>
      <Text color={theme.colors.muted}>{label.padEnd(18)}</Text>
      <Text color={theme.colors.white}>{value}</Text>
    </Box>
  );
}
