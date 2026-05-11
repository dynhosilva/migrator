import React from 'react';
import { Box, Text, useInput } from 'ink';
import { Header }    from '../components/Header';
import { IssueList } from '../components/IssueList';
import { theme }     from '../theme';
import type { MigrationPlan }  from '../../planner/types';
import type { Navigation }     from '../hooks/useNavigation';

interface RiskReviewProps {
  readonly plan:   MigrationPlan;
  readonly nav:    Navigation;
  readonly onNext: () => void;
}

export function RiskReview({ plan, nav, onNext }: RiskReviewProps): React.ReactElement {
  useInput((input, key) => {
    if (key.escape) nav.goTo('plan-review');
    if (key.return || input === 'n') onNext();
  });

  const risks = plan.risks ?? [];
  const critical = risks.filter((r) => r.level === 'high');
  const medium   = risks.filter((r) => r.level === 'medium');
  const low      = risks.filter((r) => r.level === 'low');

  return (
    <Box flexDirection="column" padding={1}>
      <Header subtitle="Revisão de riscos" />

      {risks.length === 0 && (
        <Box marginBottom={1}>
          <Text color={theme.colors.success}>{theme.symbols.check} Nenhum risco identificado</Text>
        </Box>
      )}

      {critical.length > 0 && (
        <Box flexDirection="column" marginBottom={1}>
          <IssueList
            title={`Riscos críticos (${critical.length})`}
            issues={critical.map((r) => ({
              code:       r.level,
              message:    r.message,
              severity:   'critical' as const,
              suggestion: r.suggestion,
            }))}
          />
        </Box>
      )}

      {medium.length > 0 && (
        <Box flexDirection="column" marginBottom={1}>
          <IssueList
            title={`Riscos médios (${medium.length})`}
            issues={medium.map((r) => ({
              code:       r.level,
              message:    r.message,
              severity:   'warning' as const,
              suggestion: r.suggestion,
            }))}
            limit={3}
          />
        </Box>
      )}

      {low.length > 0 && (
        <Box marginBottom={1}>
          <Text color={theme.colors.muted}>
            {theme.symbols.dot} {low.length} risco(s) de baixo impacto (omitidos)
          </Text>
        </Box>
      )}

      <Text color={theme.colors.muted}>
        Enter/n: validar plano   Esc: voltar
      </Text>
    </Box>
  );
}
