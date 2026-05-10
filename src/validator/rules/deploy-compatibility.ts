import type { ProjectContext } from '../../core/types';
import type { ValidationIssue } from '../types';
import type { ValidationRule } from '../registry';

function issue(
  code: string,
  severity: ValidationIssue['severity'],
  message: string,
  suggestion?: string,
): ValidationIssue {
  return { code, severity, rule: 'deploy-compatibility', message, suggestion };
}

export const deployCompatibilityRule: ValidationRule = {
  key: 'deploy-compatibility',

  validate(ctx: ProjectContext): ValidationIssue[] {
    const { analysis, plan } = ctx;
    if (!analysis || !plan) return [];
    const issues: ValidationIssue[] = [];

    const { deployStrategy, compatibility } = plan;

    if (deployStrategy.recommended === 'unknown') {
      issues.push(issue(
        'DEPLOY_STRATEGY_UNKNOWN',
        'critical',
        'Estratégia de deploy não determinada — não é possível gerar instruções de deploy corretas',
        'Identifique o framework do projeto e execute o migrate novamente.',
      ));
    }

    // Next.js com deploy estático é fundamentalmente incompatível (SSR + API routes)
    if (analysis.framework === 'next' && deployStrategy.recommended === 'static') {
      issues.push(issue(
        'NEXT_STATIC_INCOMPATIBLE',
        'critical',
        'Next.js é incompatível com deploy estático — SSR e API routes requerem servidor Node.js ativo',
        'Altere a estratégia de deploy para node-server ou docker antes de prosseguir.',
      ));
    }

    if (compatibility.confidence === 'unknown' || compatibility.confidence === 'low') {
      issues.push(issue(
        'DEPLOY_CONFIDENCE_LOW',
        'warning',
        `Confiança do deploy é "${compatibility.confidence}" — revise as instruções antes de usar em produção`,
        'Valide o build localmente e teste em ambiente de staging antes de fazer o deploy.',
      ));
    } else if (compatibility.confidence === 'medium') {
      issues.push(issue(
        'DEPLOY_CONFIDENCE_MEDIUM',
        'info',
        'Confiança do deploy é "média" — valide o build local antes de prosseguir para produção',
      ));
    }

    return issues;
  },
};
