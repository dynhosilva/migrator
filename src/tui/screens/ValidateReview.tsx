import React from 'react';
import { Box, Text, useInput } from 'ink';
import { Header }      from '../components/Header';
import { IssueList }   from '../components/IssueList';
import { StatusBadge } from '../components/StatusBadge';
import { theme }       from '../theme';
import type { ValidationResult } from '../../validator/types';
import type { Navigation }       from '../hooks/useNavigation';
import type { TuiAction }        from '../state/types';

interface ValidateReviewProps {
  readonly validation: ValidationResult;
  readonly force:      boolean;
  readonly dispatch:   React.Dispatch<TuiAction>;
  readonly nav:        Navigation;
  readonly onNext:     () => void;
}

export function ValidateReview({
  validation,
  force,
  dispatch,
  nav,
  onNext,
}: ValidateReviewProps): React.ReactElement {
  const blocked = !validation.safeToMigrate && !force;

  useInput((input, key) => {
    if (key.escape) nav.goTo('risk-review');
    if (input === 'f' || input === 'F') {
      dispatch({ type: 'SET_FORCE', force: true });
    }
    if ((key.return || input === 'n') && !blocked) onNext();
    if ((key.return || input === 'n') && blocked && force) onNext();
  });

  return (
    <Box flexDirection="column" padding={1}>
      <Header subtitle="Resultado da validação" />

      <Box marginBottom={1}>
        <StatusBadge
          variant={validation.safeToMigrate ? 'success' : 'error'}
          label={validation.safeToMigrate ? 'Seguro para migrar' : 'Migração bloqueada'}
        />
      </Box>

      <Box flexDirection="column" marginBottom={1}>
        <Text color={theme.colors.muted}>
          Rules executadas: {validation.summary.rulesExecuted}{'  '}
          Críticos: {validation.summary.criticalCount}{'  '}
          Avisos: {validation.summary.warningCount}
        </Text>
      </Box>

      {validation.blockingIssues.length > 0 && (
        <Box flexDirection="column" marginBottom={1}>
          <IssueList
            title="Issues bloqueantes"
            issues={validation.blockingIssues.map((i) => ({
              code:       i.code,
              message:    i.message,
              severity:   'critical' as const,
              suggestion: i.suggestion,
            }))}
          />
        </Box>
      )}

      {validation.warnings.length > 0 && (
        <Box flexDirection="column" marginBottom={1}>
          <IssueList
            title={`Avisos (${validation.warnings.length})`}
            issues={validation.warnings.map((i) => ({
              code:     i.code,
              message:  i.message,
              severity: 'warning' as const,
            }))}
            limit={4}
          />
        </Box>
      )}

      {blocked && !force && (
        <Box flexDirection="column" marginTop={1}>
          <Text color={theme.colors.warning}>
            {theme.symbols.warn} Migração bloqueada por issues críticos.
          </Text>
          <Text color={theme.colors.muted}>
            Pressione <Text color={theme.colors.warning} bold>f</Text> para forçar (--force) ou{' '}
            <Text color={theme.colors.error} bold>Esc</Text> para voltar.
          </Text>
        </Box>
      )}

      {(!blocked || force) && (
        <Text color={theme.colors.muted}>
          Enter/n: confirmar migração   Esc: voltar
        </Text>
      )}
    </Box>
  );
}
