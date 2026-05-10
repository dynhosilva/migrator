import type { ProjectContext } from '../../core/types';
import type { ValidationIssue } from '../types';
import type { ValidationRule } from '../registry';

function issue(
  code: string,
  severity: ValidationIssue['severity'],
  message: string,
  suggestion?: string,
): ValidationIssue {
  return { code, severity, rule: 'supabase', message, suggestion };
}

export const supabaseRule: ValidationRule = {
  key: 'supabase',

  validate(ctx: ProjectContext): ValidationIssue[] {
    const { analysis, plan } = ctx;
    if (!analysis || !plan) return [];
    const issues: ValidationIssue[] = [];

    const { supabase: supabaseAnalysis } = analysis;
    const { supabase: supabasePlan } = plan;

    // Edge Functions presentes mas Supabase não detectado — estado inconsistente
    if (supabaseAnalysis.edgeFunctions.count > 0 && !supabaseAnalysis.detected) {
      issues.push(issue(
        'EDGE_FUNCTIONS_WITHOUT_SUPABASE',
        'warning',
        'Edge Functions detectadas mas cliente Supabase não está configurado no projeto',
        'Verifique se a integração Supabase está correta — Edge Functions requerem instância Supabase ativa.',
      ));
    }

    // Edge Functions requerem deploy manual via CLI — não podem ser automatizadas
    if (supabasePlan.requiresEdgeFunctions) {
      issues.push(issue(
        'EDGE_FUNCTIONS_MANUAL_DEPLOY',
        'warning',
        'Edge Functions não podem ser deployadas automaticamente — requer Supabase CLI instalado e autenticado',
        'Execute: supabase functions deploy <nome> após configurar a instância Supabase destino.',
      ));
    }

    // Auth requer configuração manual de providers no dashboard
    if (supabasePlan.requiresAuth) {
      issues.push(issue(
        'SUPABASE_AUTH_UNCONFIGURED',
        'info',
        'Autenticação Supabase detectada — providers de autenticação precisam ser configurados manualmente',
        'Acesse Authentication → Providers no dashboard Supabase e configure os providers utilizados.',
      ));
    }

    // Storage requer criação manual de buckets e políticas RLS
    if (supabasePlan.requiresStorage) {
      issues.push(issue(
        'SUPABASE_STORAGE_MANUAL',
        'info',
        'Storage Supabase detectado — buckets e políticas RLS precisam ser recriados manualmente',
        'Crie os buckets em Storage → New bucket e configure as políticas de acesso (RLS).',
      ));
    }

    return issues;
  },
};
