import type { AnalysisReport } from '../../analyzer/types';
import type { MigrationPlan } from '../types';
import type { DeployStrategyResult, DeployTarget } from '../types';

export function planDeployStrategy(
  analysis: AnalysisReport,
  partial: Partial<MigrationPlan>,
): DeployStrategyResult {
  const { compatibility, infrastructure } = partial;
  const { framework, buildSystem } = analysis;
  const notes: string[] = [];

  if (!compatibility || compatibility.confidence === 'unknown') {
    return {
      recommended:  'unknown',
      alternatives: [],
      confidence:   'unknown',
      reasoning:    'Framework não identificado — estratégia de deploy não pode ser determinada',
      notes:        ['Identifique o framework do projeto antes de prosseguir com o planejamento'],
    };
  }

  if (framework === 'next') {
    const alternatives: DeployTarget[] = ['docker'];
    notes.push('Next.js requer Node.js >= 18 no servidor destino');
    if (infrastructure?.requiresSupabase) {
      notes.push('Supabase é client-side — compatível com deploy server-side Next.js');
    }
    return {
      recommended:  'node-server',
      alternatives,
      confidence:   'medium',
      reasoning:    'Next.js suporta SSR por padrão — deploy server-side (Node.js ou Docker) é o caminho mais seguro',
      notes,
    };
  }

  // react | vue | svelte
  if (compatibility.canDeployStatic) {
    const alternatives: DeployTarget[] = ['node-server', 'docker'];
    const bs = buildSystem !== 'unknown' ? buildSystem : 'build tool';
    notes.push(`Gerar build: npm run build → pasta dist/ via ${bs}`);
    if (infrastructure?.requiresSupabase) {
      notes.push('Supabase opera no client-side — totalmente compatível com hosting estático');
    }
    return {
      recommended:  'static',
      alternatives,
      confidence:   compatibility.confidence,
      reasoning:    `${framework} com ${bs} gera bundle estático — ideal para CDN ou hosting simples`,
      notes,
    };
  }

  return {
    recommended:  'unknown',
    alternatives: ['docker', 'node-server'],
    confidence:   'low',
    reasoning:    'Compatibilidade de deploy não pôde ser determinada — verificação manual necessária',
    notes,
  };
}
