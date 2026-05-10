import type { ExecutionState, ExecutionIssue, ExecutionReadiness, ExecutionSummary } from '../types';

export function buildSummary(partial: Partial<ExecutionState>): ExecutionSummary {
  const allIssues: ExecutionIssue[] = [
    ...(partial.dockerCheck?.issues   ?? []),
    ...(partial.buildCheck?.issues    ?? []),
    ...(partial.envCheck?.issues      ?? []),
    ...(partial.runtimeCheck?.issues  ?? []),
  ];

  const blockers = allIssues.filter((i) => i.severity === 'blocker');
  const warnings = allIssues.filter((i) => i.severity === 'warning');
  const infos    = allIssues.filter((i) => i.severity === 'info');

  const readiness: ExecutionReadiness =
    blockers.length > 0 ? 'blocked' :
    warnings.length > 0 ? 'ready-with-warnings' :
    'ready';

  return {
    readiness,
    blockers,
    warnings,
    infos,
    tasksExecuted: 4,
  };
}
