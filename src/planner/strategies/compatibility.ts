import type { AnalysisReport } from '../../analyzer/types';
import type { CompatibilityResult } from '../types';

export function planCompatibility(analysis: AnalysisReport): CompatibilityResult {
  const reasons: string[] = [];
  const { framework, buildSystem } = analysis;

  if (framework === 'unknown') {
    reasons.push('Framework não identificado — compatibilidade de deploy não pode ser determinada');
    return { canDeployStatic: false, canDeployServer: false, confidence: 'unknown', reasons };
  }

  if (framework === 'next') {
    reasons.push('Next.js detectado — suporte nativo a deploy server-side (Node.js)');
    reasons.push('Export estático requer verificação manual: projeto pode usar SSR ou API Routes');
    return { canDeployStatic: false, canDeployServer: true, confidence: 'medium', reasons };
  }

  // react | vue | svelte
  if (buildSystem === 'unknown') {
    reasons.push(`${framework} detectado, mas build system não identificado — deploy estático provável, não garantido`);
    return { canDeployStatic: true, canDeployServer: true, confidence: 'low', reasons };
  }

  reasons.push(`${framework} com ${buildSystem} — compatível com deploy estático e server-side`);
  return { canDeployStatic: true, canDeployServer: true, confidence: 'high', reasons };
}
