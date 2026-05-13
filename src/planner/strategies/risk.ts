import type { AnalysisReport } from '../../analyzer/types';
import type { MigrationPlan, Risk } from '../types';

export function detectRisks(analysis: AnalysisReport, partial: Partial<MigrationPlan>): Risk[] {
  const risks: Risk[] = [];
  const { framework, buildSystem, envVars } = analysis;
  const { compatibility, infrastructure, supabase: supabasePlan, env } = partial;

  if (framework === 'unknown') {
    risks.push({
      level:      'critical',
      message:    'Framework não identificado — migração não pode ser automatizada',
      suggestion: 'Verifique se o projeto é um export válido do Lovable.dev ou tente exportar novamente',
    });
  }

  if (framework !== 'unknown' && buildSystem === 'unknown') {
    risks.push({
      level:      'medium',
      message:    'Build system não identificado — o processo de build pode falhar',
      suggestion: 'Verifique os scripts do package.json e adicione configuração de build explícita',
    });
  }

  if (
    compatibility &&
    !compatibility.canDeployStatic &&
    !compatibility.canDeployServer &&
    compatibility.confidence !== 'unknown'
  ) {
    risks.push({
      level:      'high',
      message:    'Nenhuma estratégia de deploy viável identificada automaticamente',
      suggestion: 'Verifique manualmente o tipo de projeto e a estratégia de deploy adequada',
    });
  }

  if (supabasePlan?.requiresEdgeFunctions) {
    risks.push({
      level:      'high',
      message:    'Edge Functions detectadas — não são deployadas automaticamente',
      suggestion: 'Execute o deploy das Edge Functions via Supabase CLI antes de colocar o projeto em produção',
    });
  }

  if (supabasePlan?.requiresMigrations) {
    risks.push({
      level:      'medium',
      message:    'Migrations de banco de dados detectadas — aplicação incorreta pode corromper dados',
      suggestion: 'Teste as migrations em ambiente de staging antes de aplicar em produção',
    });
  }

  if (supabasePlan?.requiresRealtime) {
    risks.push({
      level:      'medium',
      message:    'Realtime do Supabase em uso — pode não funcionar em todos os planos ou configurações',
      suggestion: 'Verifique limites de conexão simultânea no plano do Supabase destino',
    });
  }

  if (infrastructure?.requiresNodeServer) {
    risks.push({
      level:      'low',
      message:    'Projeto requer servidor Node.js — hosting estático simples não é suficiente',
      suggestion: 'Configure VPS, Docker ou plataforma com suporte a Node.js (ex: Railway, Render)',
    });
  }

  if (env?.required && env.required.length > 0) {
    const n = env.required.length;
    risks.push({
      level:      'critical',
      message:    `${n} ${n === 1 ? 'variável de ambiente precisa ser configurada' : 'variáveis de ambiente precisam ser configuradas'} antes do deploy`,
      suggestion: 'Configure todas as variáveis de ambiente no servidor destino antes de iniciar a aplicação',
    });
  }

  return risks;
}
