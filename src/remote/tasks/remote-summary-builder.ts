import type { ProjectContext } from '../../core/types';
import type { RemoteState, RemoteConfig, RemoteSummaryArtifacts, GeneratedFile, RemoteIssue } from '../types';

export function buildRemoteSummary(
  ctx: ProjectContext,
  _config: RemoteConfig,
  partial: Partial<RemoteState>,
): RemoteSummaryArtifacts {
  const projectName = ctx.meta.name;

  const allIssues: RemoteIssue[] = [
    ...(partial.hostCheck?.issues       ?? []),
    ...(partial.sshCheck?.issues        ?? []),
    ...(partial.transferPlan?.issues    ?? []),
    ...(partial.deploymentCheck?.issues ?? []),
  ];

  const blockers = allIssues.filter((i) => i.severity === 'blocker');
  const warnings = allIssues.filter((i) => i.severity === 'warning');
  const infos    = allIssues.filter((i) => i.severity === 'info');

  const readiness = blockers.length > 0 ? 'blocked'
    : warnings.length > 0 ? 'ready-with-warnings'
    : 'ready';

  const readinessLabel = readiness === 'ready' ? '✓ PRONTO'
    : readiness === 'ready-with-warnings' ? '⚠ PRONTO com avisos'
    : '✗ BLOQUEADO';

  const lines: string[] = [
    `# Sumário — Deploy Remoto: ${projectName}`,
    '',
    `## Status: ${readinessLabel}`,
    '',
    '## Verificações',
    '',
    `- **Host compatível:** ${partial.hostCheck?.compatible ? 'Sim' : 'Não'}`,
    `- **Config SSH válida:** ${partial.sshCheck?.valid ? 'Sim' : 'Não'}`,
    `- **Estratégia de deploy:** ${partial.deploymentCheck?.strategy ?? 'desconhecida'}`,
    `- **Deploy compatível:** ${partial.deploymentCheck?.compatible ? 'Sim' : 'Não'}`,
    `- **Arquivos a transferir:** ${partial.transferPlan?.files.length ?? 0} (${partial.transferPlan?.totalEstimatedSizeKB ?? 0}KB)`,
    `- **Passos no plano:** ${partial.executionPlan?.steps.length ?? 0}`,
    '',
  ];

  function renderIssues(label: string, issues: RemoteIssue[]): void {
    if (issues.length === 0) return;
    lines.push(`## ${label}`);
    lines.push('');
    for (const issue of issues) {
      lines.push(`- **[${issue.code}]** ${issue.message}`);
      if (issue.suggestion) lines.push(`  - Sugestão: ${issue.suggestion}`);
    }
    lines.push('');
  }

  renderIssues('Bloqueadores', blockers);
  renderIssues('Avisos', warnings);
  renderIssues('Informações', infos);

  lines.push('## Próximos passos');
  lines.push('');

  if (readiness === 'blocked') {
    lines.push('1. Resolva os bloqueadores listados acima antes de prosseguir.');
    lines.push('2. Revise o perfil do host e a configuração SSH.');
  } else {
    lines.push('1. Revise o arquivo `remote/remote-dry-run.md` para confirmar o plano.');
    lines.push('2. Execute os passos de `remote/remote-execution-plan.json` manualmente.');
    lines.push('3. Use o executor v2 (futuro) para execução automatizada via SSH.');
  }

  lines.push('');
  lines.push('---');
  lines.push('');
  lines.push(`_Gerado em: ${new Date().toISOString()}_`);

  const files: GeneratedFile[] = [
    {
      relativePath: 'remote/remote-summary.md',
      content:      lines.join('\n'),
      description:  'Sumário do planejamento de deploy remoto',
    },
  ];

  return { files };
}
