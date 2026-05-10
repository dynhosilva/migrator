import type { ProjectContext } from '../../core/types';
import type { MigrationResult, MigrationReportArtifact, GeneratedFile } from '../types';

export function generateSummary(
  ctx: ProjectContext,
  partial: Partial<MigrationResult>,
): MigrationReportArtifact {
  const analysis = ctx.analysis!;
  const plan     = ctx.plan!;

  const envFiles          = partial.env?.files.length ?? 0;
  const migrationFiles    = partial.migrations?.files.length ?? 0;
  const edgeFuncFiles     = partial.edgeFunctions?.files.length ?? 0;
  const deployFiles       = partial.deployInstructions?.files.length ?? 0;
  const readmeFiles       = partial.folderReadmes?.files.length ?? 0;
  const thisFile          = 1;  // migration-summary.json
  const totalFilesGenerated = envFiles + migrationFiles + edgeFuncFiles + deployFiles + readmeFiles + thisFile;

  const pendingManualSteps = plan.supabase.manualSteps;
  const warnings = [
    ...plan.warnings,
    ...(partial.migrations?.skipped && analysis.supabase.detected
      ? ['Nenhum arquivo de migration encontrado nos arquivos do projeto']
      : []),
    ...(partial.edgeFunctions?.skipped && analysis.supabase.edgeFunctions.count > 0
      ? ['Edge functions detectadas na análise mas nenhum arquivo encontrado nos arquivos do projeto']
      : []),
  ];

  const criticalRisks = plan.risks
    .filter((r) => r.level === 'critical')
    .map((r) => r.message);

  const summaryData = {
    projectName:    analysis.projectName,
    generatedAt:    new Date().toISOString(),
    migrator:       'lovable-migrate v1',
    totalFilesGenerated,
    artifacts: {
      envFiles,
      migrationFiles,
      edgeFunctionFiles: edgeFuncFiles,
      deployInstructionFiles: deployFiles,
      readmeFiles,
    },
    deploy: {
      recommended:  plan.deployStrategy.recommended,
      confidence:   plan.deployStrategy.confidence,
      alternatives: plan.deployStrategy.alternatives,
    },
    supabase: {
      detected:              analysis.supabase.detected,
      migrationsExported:    migrationFiles,
      edgeFunctionsExported: partial.edgeFunctions?.count ?? 0,
    },
    pendingManualSteps,
    warnings,
    criticalRisks,
    allRisks: plan.risks.map((r) => ({ level: r.level, message: r.message, suggestion: r.suggestion })),
    checklist: plan.checklist.map((item) => ({
      id:       item.id,
      label:    item.label,
      required: item.required,
      done:     false,
    })),
  };

  const file: GeneratedFile = {
    relativePath: 'reports/migration-summary.json',
    content:      JSON.stringify(summaryData, null, 2),
    description:  'Sumário completo da migração com artefatos, riscos e pendências',
  };

  return {
    files: [file],
    totalFilesGenerated,
    pendingManualSteps,
    warnings,
  };
}
