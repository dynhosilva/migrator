import type { ReleaseSummary } from '../types';
import type { CicdTaskContext } from '../registry';

export function generateReleaseWorkflow(_taskCtx: CicdTaskContext): ReleaseSummary {
  return { files: [], issues: [] };
}
