import type { ProjectContext } from '../../core/types';
import type { ValidationIssue } from '../types';
import type { ValidationRule } from '../registry';

function issue(
  code: string,
  severity: ValidationIssue['severity'],
  message: string,
  suggestion?: string,
): ValidationIssue {
  return { code, severity, rule: 'framework', message, suggestion };
}

const SUPPORTED_FRAMEWORKS = new Set(['react', 'next', 'vue', 'svelte']);

export const frameworkRule: ValidationRule = {
  key: 'framework',

  validate(ctx: ProjectContext): ValidationIssue[] {
    const { analysis } = ctx;
    if (!analysis) return [];
    const issues: ValidationIssue[] = [];

    if (analysis.framework === 'unknown') {
      issues.push(issue(
        'FRAMEWORK_UNKNOWN',
        'critical',
        'Framework não identificado — migração automatizada não é possível',
        'O projeto deve ser um export válido do Lovable.dev com package.json contendo React, Next.js, Vue ou Svelte.',
      ));
    } else if (!SUPPORTED_FRAMEWORKS.has(analysis.framework)) {
      issues.push(issue(
        'FRAMEWORK_UNSUPPORTED',
        'warning',
        `Framework "${analysis.framework}" não tem suporte completo — alguns artefatos podem estar incompletos`,
        'A migração prosseguirá, mas revise as instruções de deploy geradas antes de usar em produção.',
      ));
    }

    return issues;
  },
};
