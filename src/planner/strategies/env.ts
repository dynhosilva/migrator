import type { AnalysisReport } from '../../analyzer/types';
import type { EnvResult } from '../types';

const SUPABASE_PATTERNS = ['SUPABASE_URL', 'SUPABASE_ANON_KEY', 'SUPABASE_SERVICE_ROLE', 'SUPABASE_DB_'];

function isSupabaseVar(name: string): boolean {
  return SUPABASE_PATTERNS.some((p) => name.toUpperCase().includes(p));
}

export function planEnv(analysis: AnalysisReport): EnvResult {
  const { envVars, supabase } = analysis;
  const warnings: string[] = [];

  if (supabase.detected && !envVars.some(isSupabaseVar)) {
    warnings.push(
      'Supabase detectado mas nenhuma variável de ambiente do Supabase encontrada — ' +
      'verifique se as vars estão definidas apenas em arquivo .env local',
    );
  }

  // Conservador: todas as variáveis detectadas são tratadas como obrigatórias.
  // Nenhuma tem valor conhecido neste estágio — todas precisam ser configuradas.
  const required = [...envVars];
  const optional: string[] = [];
  const missing  = [...envVars];

  return { required, optional, missing, warnings };
}
