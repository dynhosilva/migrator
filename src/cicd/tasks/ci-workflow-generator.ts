import type { CiSummary } from '../types';
import type { CicdTaskContext } from '../registry';

export function generateCiWorkflow(_taskCtx: CicdTaskContext): CiSummary {
  return { files: [], issues: [] };
}
