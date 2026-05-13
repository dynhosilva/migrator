import type { ProjectContext } from '../../core/types';
import type { ValidationIssue } from '../types';
import type { ValidationRule } from '../registry';

function issue(
  code: string,
  severity: ValidationIssue['severity'],
  message: string,
  suggestion?: string,
): ValidationIssue {
  return { code, severity, rule: 'env', message, suggestion };
}

export const envRule: ValidationRule = {
  key: 'env',

  validate(ctx: ProjectContext): ValidationIssue[] {
    const { plan } = ctx;
    if (!plan) return [];
    const issues: ValidationIssue[] = [];

    const { required, missing, warnings } = plan.env;

    // Conservador: todas as vars detectadas são tratadas como missing pelo planner.
    // Crítico pois a aplicação não iniciará sem elas.
    if (missing.length > 0) {
      issues.push(issue(
        'ENV_VARS_UNRESOLVED',
        'critical',
        `${missing.length} ${missing.length === 1 ? 'variável de ambiente obrigatória' : 'variáveis de ambiente obrigatórias'} não configurada${missing.length === 1 ? '' : 's'}: ${missing.join(', ')}`,
        'Configure as variáveis no servidor destino antes de iniciar a aplicação. Template disponível em env/.env.example.',
      ));
    } else if (required.length === 0) {
      issues.push(issue(
        'ENV_VARS_NONE_DETECTED',
        'info',
        'Nenhuma variável de ambiente detectada — verifique se o projeto requer configuração de ambiente',
      ));
    }

    for (const w of warnings) {
      issues.push(issue('ENV_WARNING', 'warning', w));
    }

    return issues;
  },
};
