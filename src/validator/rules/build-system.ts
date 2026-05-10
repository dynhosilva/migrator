import type { ProjectContext } from '../../core/types';
import type { ValidationIssue } from '../types';
import type { ValidationRule } from '../registry';

function issue(
  code: string,
  severity: ValidationIssue['severity'],
  message: string,
  suggestion?: string,
): ValidationIssue {
  return { code, severity, rule: 'build-system', message, suggestion };
}

export const buildSystemRule: ValidationRule = {
  key: 'build-system',

  validate(ctx: ProjectContext): ValidationIssue[] {
    const { analysis } = ctx;
    if (!analysis) return [];
    const issues: ValidationIssue[] = [];

    if (analysis.buildSystem === 'unknown') {
      issues.push(issue(
        'BUILD_SYSTEM_UNKNOWN',
        'warning',
        'Build system não identificado — comandos de build nas instruções podem estar incorretos',
        'Verifique se o projeto contém vite.config.ts, next.config.js ou webpack.config.js.',
      ));
    }

    return issues;
  },
};
