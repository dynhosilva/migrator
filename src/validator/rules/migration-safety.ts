import type { ProjectContext } from '../../core/types';
import type { ValidationIssue } from '../types';
import type { ValidationRule } from '../registry';

function issue(
  code: string,
  severity: ValidationIssue['severity'],
  message: string,
  suggestion?: string,
): ValidationIssue {
  return { code, severity, rule: 'migration-safety', message, suggestion };
}

export const migrationSafetyRule: ValidationRule = {
  key: 'migration-safety',

  validate(ctx: ProjectContext): ValidationIssue[] {
    const { analysis } = ctx;
    if (!analysis) return [];
    const issues: ValidationIssue[] = [];

    const { migrations } = analysis.supabase;

    if (migrations.count > 0) {
      issues.push(issue(
        'MIGRATIONS_REQUIRE_STAGING',
        'warning',
        `${migrations.count} ${migrations.count === 1 ? 'migration SQL detectada' : 'migrations SQL detectadas'} — aplicação incorreta pode corromper dados em produção`,
        'Teste as migrations em ambiente de staging antes de aplicar em produção: supabase db push',
      ));

      if (migrations.count > 1) {
        issues.push(issue(
          'MIGRATIONS_ORDER_UNVERIFIED',
          'info',
          `Ordem de execução das ${migrations.count} migrations assumida por nome de arquivo — verifique dependências entre migrations`,
          'Revise os arquivos em supabase/migrations/ e confirme que podem ser aplicados sequencialmente sem conflitos.',
        ));
      }
    }

    return issues;
  },
};
