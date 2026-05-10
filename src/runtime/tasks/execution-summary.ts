import type { ProjectContext } from '../../core/types';
import type {
  RuntimeSummaryArtifacts,
  RuntimeState,
  RuntimeReadiness,
  RuntimeIssue,
  GeneratedFile,
} from '../types';

const READINESS_LABEL: Record<RuntimeReadiness, string> = {
  success: '✅ Execução bem-sucedida',
  partial: '⚠️  Execução parcial (com avisos)',
  failed:  '❌ Execução falhou',
};

function issueBlock(issues: RuntimeIssue[], title: string): string {
  if (issues.length === 0) return '';
  let md = `### ${title}\n\n`;
  for (const issue of issues) {
    md += `- **${issue.code}**: ${issue.message}\n`;
    if (issue.suggestion) md += `  - _${issue.suggestion}_\n`;
  }
  return md + '\n';
}

export function generateExecutionSummary(
  ctx: ProjectContext,
  partial: Partial<RuntimeState>,
  readiness: RuntimeReadiness,
): RuntimeSummaryArtifacts {
  const projectName = ctx.analysis?.projectName ?? ctx.meta.name;
  const install     = partial.install;
  const build       = partial.build;
  const docker      = partial.dockerBuild;

  let md = `# Runtime Summary — ${projectName}\n\n`;
  md += `**Status:** ${READINESS_LABEL[readiness]}\n\n`;

  md += `## O que foi executado\n\n`;
  md += `| Etapa | Resultado |\n`;
  md += `|---|---|\n`;
  md += `| npm install | ${install?.skipped ? '⏭ pulado' : install?.success ? '✅ sucesso' : '❌ falhou'} |\n`;
  md += `| Build | ${build?.skipped ? '⏭ pulado' : build?.success ? '✅ sucesso' : '❌ falhou'} |\n`;
  md += `| Docker build | ${docker?.skipped ? '⏭ pulado' : docker?.success ? '✅ sucesso' : '❌ falhou'} |\n`;
  md += `\n`;

  if (build?.command && !build.skipped) {
    md += `**Duração do build:** ${build.command.durationMs}ms\n\n`;
  }

  const allBlockers: RuntimeIssue[] = [
    ...(install?.issues.filter((i) => i.severity === 'blocker') ?? []),
    ...(build?.issues.filter((i) => i.severity === 'blocker') ?? []),
    ...(docker?.issues.filter((i) => i.severity === 'blocker') ?? []),
    ...(partial.artifacts?.issues.filter((i) => i.severity === 'blocker') ?? []),
  ];
  const allWarnings: RuntimeIssue[] = [
    ...(install?.issues.filter((i) => i.severity === 'warning') ?? []),
    ...(build?.issues.filter((i) => i.severity === 'warning') ?? []),
    ...(docker?.issues.filter((i) => i.severity === 'warning') ?? []),
    ...(partial.artifacts?.issues.filter((i) => i.severity === 'warning') ?? []),
  ];

  if (allBlockers.length > 0) {
    md += `## Bloqueadores\n\n`;
    md += issueBlock(allBlockers, 'Issues que impediram execução completa');
  }

  if (allWarnings.length > 0) {
    md += `## Avisos\n\n`;
    md += issueBlock(allWarnings, 'Issues não-bloqueantes');
  }

  md += `## Próximos passos\n\n`;
  if (readiness === 'success') {
    md += `- Imagem Docker \`${docker?.imageTag ?? projectName}:latest\` pronta para uso\n`;
    md += `- Execute \`docker compose up -d\` para iniciar os serviços\n`;
  } else if (readiness === 'partial') {
    md += `- Revise os avisos acima antes de prosseguir para produção\n`;
  } else {
    md += `- Corrija os bloqueadores acima e execute o runtime novamente\n`;
    md += `- Consulte \`runtime/runtime-log.json\` para detalhes dos erros\n`;
  }

  md += `\n---\n_Gerado em: ${new Date().toISOString()}_\n`;

  const file: GeneratedFile = {
    relativePath: 'runtime/runtime-summary.md',
    content:      md,
    description:  'Sumário de execução do runtime v1',
  };

  return { files: [file] };
}
