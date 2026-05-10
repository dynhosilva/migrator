import type { AnalysisReport } from '../../analyzer/types';
import type { InfrastructureResult } from '../types';

export function planInfrastructure(analysis: AnalysisReport): InfrastructureResult {
  const { supabase, framework } = analysis;
  const notes: string[] = [];

  const requiresSupabase       = supabase.detected;
  const requiresDatabase       = supabase.detected && supabase.migrations.count > 0;
  const requiresObjectStorage  = supabase.detected && supabase.usesStorage;
  const requiresServerlessEdge = supabase.detected && supabase.edgeFunctions.count > 0;
  const requiresNodeServer     = framework === 'next';

  if (requiresSupabase) {
    notes.push('Instância própria do Supabase é necessária');
  }
  if (requiresDatabase) {
    notes.push(`${supabase.migrations.count} migration(s) precisam ser aplicadas ao banco de dados`);
  }
  if (requiresObjectStorage) {
    notes.push('Supabase Storage em uso — buckets precisam ser criados e políticas RLS configuradas');
  }
  if (requiresServerlessEdge) {
    notes.push(`${supabase.edgeFunctions.count} Edge Function(s) precisam ser deployadas manualmente`);
  }
  if (requiresNodeServer) {
    notes.push('Next.js requer servidor Node.js (VPS, Docker ou plataforma compatível)');
  }
  if (!requiresSupabase && !requiresNodeServer) {
    notes.push('Infraestrutura mínima — projeto pode rodar em hosting estático simples');
  }

  return {
    requiresSupabase,
    requiresDatabase,
    requiresObjectStorage,
    requiresServerlessEdge,
    requiresNodeServer,
    notes,
  };
}
