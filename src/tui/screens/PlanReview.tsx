import React from 'react';
import { Box, Text, useInput } from 'ink';
import { Header }      from '../components/Header';
import { StatusBadge } from '../components/StatusBadge';
import { theme }       from '../theme';
import type { MigrationPlan } from '../../planner/types';
import type { Navigation }    from '../hooks/useNavigation';

interface PlanReviewProps {
  readonly plan: MigrationPlan;
  readonly nav:  Navigation;
  readonly onNext: () => void;
}

export function PlanReview({ plan, nav, onNext }: PlanReviewProps): React.ReactElement {
  useInput((input, key) => {
    if (key.escape) nav.goTo('analyze-review');
    if (key.return || input === 'n') onNext();
  });

  const confidence  = plan.compatibility.confidence;
  const badgeVariant = confidence === 'high' ? 'success'
    : confidence === 'medium' ? 'warning'
    : 'error';

  return (
    <Box flexDirection="column" padding={1}>
      <Header subtitle="Plano de migração" />

      <Box flexDirection="column" marginBottom={1}>
        <Box>
          <Text color={theme.colors.muted}>{'Estratégia'.padEnd(18)}</Text>
          <Text color={theme.colors.primary} bold>{plan.deployStrategy.recommended}</Text>
        </Box>
        <Box>
          <Text color={theme.colors.muted}>{'Confiança'.padEnd(18)}</Text>
          <StatusBadge variant={badgeVariant} label={confidence} />
        </Box>
        <Box>
          <Text color={theme.colors.muted}>{'Node server'.padEnd(18)}</Text>
          <Text>{plan.infrastructure.requiresNodeServer ? 'Sim' : 'Não'}</Text>
        </Box>
        <Box>
          <Text color={theme.colors.muted}>{'Supabase'.padEnd(18)}</Text>
          <Text>{plan.infrastructure.requiresSupabase ? 'Sim' : 'Não'}</Text>
        </Box>
      </Box>

      <Box flexDirection="column" marginBottom={1}>
        <Text bold color={theme.colors.white}>
          Env vars obrigatórias ({plan.env.required.length})
        </Text>
        {plan.env.required.slice(0, 6).map((v) => (
          <Text key={v} color={theme.colors.muted}>  {theme.symbols.dot} {v}</Text>
        ))}
        {plan.env.missing.length > 0 && (
          <Text color={theme.colors.warning}>
            {theme.symbols.warn} {plan.env.missing.length} var(s) faltando
          </Text>
        )}
      </Box>

      {plan.warnings.length > 0 && (
        <Box flexDirection="column" marginBottom={1}>
          <Text bold color={theme.colors.warning}>Avisos ({plan.warnings.length})</Text>
          {plan.warnings.slice(0, 4).map((w, i) => (
            <Text key={i} color={theme.colors.muted}>  {theme.symbols.warn} {w}</Text>
          ))}
        </Box>
      )}

      <Text color={theme.colors.muted}>
        Enter/n: ver riscos   Esc: voltar
      </Text>
    </Box>
  );
}
