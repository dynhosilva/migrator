import type { AnalysisReport } from '../../analyzer/types';
import type { SupabasePlanResult } from '../types';

export function planSupabase(analysis: AnalysisReport): SupabasePlanResult {
  const { supabase } = analysis;

  if (!supabase.detected) {
    return {
      requiresOwnInstance:   false,
      requiresMigrations:    false,
      requiresEdgeFunctions: false,
      requiresAuth:          false,
      requiresStorage:       false,
      requiresRealtime:      false,
      manualSteps:           [],
      warnings:              [],
    };
  }

  const manualSteps: string[] = [];
  const warnings: string[]    = [];

  manualSteps.push('Criar projeto no Supabase (app.supabase.com ou instância self-hosted)');
  manualSteps.push('Copiar URL e chaves de API para as variáveis de ambiente do projeto');

  if (supabase.usesAuth) {
    manualSteps.push('Configurar providers de autenticação (OAuth, email, etc.) na instância destino');
  }

  if (supabase.migrations.count > 0) {
    const mc = supabase.migrations.count;
    manualSteps.push(
      `Executar ${mc} ${mc === 1 ? 'migration' : 'migrations'} via Supabase CLI (supabase db push)`,
    );
    manualSteps.push('Verificar ordem de execução e idempotência das migrations');
  }

  if (supabase.usesStorage) {
    manualSteps.push('Recriar buckets do Storage e configurar políticas de acesso (RLS)');
    warnings.push('Arquivos do Storage não são migrados automaticamente — cópia manual necessária se houver dados em produção');
  }

  if (supabase.edgeFunctions.count > 0) {
    const names = supabase.edgeFunctions.names.join(', ');
    const efc = supabase.edgeFunctions.count;
    manualSteps.push(`Deployar ${efc === 1 ? 'Edge Function' : 'Edge Functions'} via Supabase CLI: ${names}`);
    warnings.push('Edge Functions não são deployadas automaticamente — requer Supabase CLI instalado e autenticado');
  }

  if (supabase.usesRealtime) {
    warnings.push('Realtime detectado — verifique se o plano do Supabase destino suporta o número de conexões simultâneas esperado');
  }

  return {
    requiresOwnInstance:   true,
    requiresMigrations:    supabase.migrations.count > 0,
    requiresEdgeFunctions: supabase.edgeFunctions.count > 0,
    requiresAuth:          supabase.usesAuth,
    requiresStorage:       supabase.usesStorage,
    requiresRealtime:      supabase.usesRealtime,
    manualSteps,
    warnings,
  };
}
