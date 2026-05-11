/**
 * Testes de renderização da IssueList — componente de exibição de riscos.
 */

import React from 'react';
import { describe, it, expect } from 'vitest';
import { render } from 'ink-testing-library';
import { IssueList } from '../../../src/tui/components/IssueList';
import type { Issue } from '../../../src/tui/components/IssueList';

const CRITICAL_ISSUE: Issue = {
  code:       'ENV_VARS_UNRESOLVED',
  message:    'Variáveis de ambiente não configuradas: VITE_API_URL',
  severity:   'critical',
  suggestion: 'Configure todas as variáveis antes de migrar',
};

const WARNING_ISSUE: Issue = {
  code:    'DEPLOY_CONFIDENCE_LOW',
  message: 'Confiança no deploy strategy é baixa',
  severity: 'warning',
};

const INFO_ISSUE: Issue = {
  code:    'MIGRATIONS_REQUIRE_STAGING',
  message: 'Migrations requerem ambiente de staging',
  severity: 'info',
};

describe('IssueList — renderização de riscos', () => {
  it('exibe título quando fornecido', () => {
    const { lastFrame } = render(
      <IssueList issues={[CRITICAL_ISSUE]} title="Issues críticos" />,
    );
    expect(lastFrame()).toContain('Issues críticos');
  });

  it('exibe CRÍTICO para issues críticos', () => {
    const { lastFrame } = render(<IssueList issues={[CRITICAL_ISSUE]} />);
    expect(lastFrame()).toContain('CRÍTICO');
    expect(lastFrame()).toContain('Variáveis de ambiente não configuradas');
  });

  it('exibe AVISO para warnings', () => {
    const { lastFrame } = render(<IssueList issues={[WARNING_ISSUE]} />);
    expect(lastFrame()).toContain('AVISO');
  });

  it('exibe INFO para infos', () => {
    const { lastFrame } = render(<IssueList issues={[INFO_ISSUE]} />);
    expect(lastFrame()).toContain('INFO');
  });

  it('exibe suggestion quando disponível', () => {
    const { lastFrame } = render(<IssueList issues={[CRITICAL_ISSUE]} />);
    expect(lastFrame()).toContain('Configure todas as variáveis');
  });

  it('exibe "Nenhum issue" quando lista vazia', () => {
    const { lastFrame } = render(<IssueList issues={[]} />);
    expect(lastFrame()).toContain('Nenhum issue');
  });

  it('respeita o limite de exibição', () => {
    const many: Issue[] = Array.from({ length: 5 }, (_, i) => ({
      code:     `CODE_${i}`,
      message:  `Issue número ${i}`,
      severity: 'warning' as const,
    }));
    const { lastFrame } = render(<IssueList issues={many} limit={2} />);
    expect(lastFrame()).toContain('Issue número 0');
    expect(lastFrame()).toContain('Issue número 1');
    expect(lastFrame()).not.toContain('Issue número 4');
    expect(lastFrame()).toContain('mais 3 issue(s)');
  });

  it('renderiza múltiplas severidades juntas', () => {
    const { lastFrame } = render(
      <IssueList issues={[CRITICAL_ISSUE, WARNING_ISSUE, INFO_ISSUE]} />,
    );
    expect(lastFrame()).toContain('CRÍTICO');
    expect(lastFrame()).toContain('AVISO');
    expect(lastFrame()).toContain('INFO');
  });
});
