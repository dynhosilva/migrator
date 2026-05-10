import type { ProjectContext } from '../../core/types';
import type { DryRunArtifacts, ExecutionState, GeneratedFile } from '../types';

const READINESS_LABEL: Record<string, string> = {
  'ready':               '✅ Pronto para execução',
  'ready-with-warnings': '⚠️  Pronto com avisos',
  'blocked':             '❌ Bloqueado',
};

export function generateDryRun(
  ctx: ProjectContext,
  partial: Partial<ExecutionState>,
): DryRunArtifacts {
  const analysis = ctx.analysis;
  const projectName = analysis?.projectName ?? ctx.meta.name;
  const steps = partial.plan?.steps ?? [];
  const envCheck = partial.envCheck;
  const summary = partial.summary;
  const readiness = summary?.readiness ?? 'blocked';
  const pm = analysis?.packageManager ?? 'npm';

  let md = `# Dry Run — ${projectName}\n\n`;
  md += `**Status:** ${READINESS_LABEL[readiness] ?? readiness}\n\n`;

  if (envCheck) {
    md += `## Ambiente\n\n`;
    md += `| Ferramenta | Disponível | Versão |\n`;
    md += `|---|---|---|\n`;
    md += `| Node.js | ${envCheck.nodeAvailable ? '✓' : '✗'} | ${envCheck.nodeVersion ?? '—'} |\n`;
    md += `| Docker | ${envCheck.dockerAvailable ? '✓' : '✗'} | ${envCheck.dockerVersion ?? '—'} |\n`;
    md += `| ${pm} | ${envCheck.packageManagerAvailable ? '✓' : '✗'} | ${envCheck.packageManagerVersion ?? '—'} |\n`;
    md += `\n`;
  }

  if (steps.length > 0) {
    md += `## Passos de execução\n\n`;
    steps.forEach((step, i) => {
      md += `### ${i + 1}. ${step.description}\n\n`;
      md += `\`\`\`bash\n${step.command}\n\`\`\`\n\n`;
      if (step.cwd) {
        md += `> Executar em: \`${step.cwd}\`\n\n`;
      }
    });
  }

  if ((summary?.blockers.length ?? 0) > 0) {
    md += `## Bloqueadores\n\n`;
    for (const issue of summary!.blockers) {
      md += `- **${issue.code}**: ${issue.message}\n`;
      if (issue.suggestion) md += `  - _${issue.suggestion}_\n`;
    }
    md += `\n`;
  }

  if ((summary?.warnings.length ?? 0) > 0) {
    md += `## Avisos\n\n`;
    for (const issue of summary!.warnings) {
      md += `- **${issue.code}**: ${issue.message}\n`;
      if (issue.suggestion) md += `  - _${issue.suggestion}_\n`;
    }
    md += `\n`;
  }

  md += `---\n_Gerado em: ${new Date().toISOString()}_\n`;

  const file: GeneratedFile = {
    relativePath: 'execution/dry-run.md',
    content: md,
    description: 'Preview de execução em modo dry-run',
  };

  return { files: [file] };
}
