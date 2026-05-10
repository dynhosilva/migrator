import type { ProjectContext } from '../../core/types';
import type { DeployReport, GeneratedFile } from '../types';
import type { DockerArtifacts } from '../types';

export function generateDeployReport(
  ctx: ProjectContext,
  docker: DockerArtifacts,
): DeployReport {
  const analysis = ctx.analysis!;
  const plan     = ctx.plan!;
  const strategy = plan.deployStrategy.recommended;
  const notes: string[] = [];

  if (strategy === 'unknown') {
    notes.push('Estratégia de deploy não determinada — revise o framework do projeto.');
  }

  if (plan.deployStrategy.confidence === 'low') {
    notes.push('Confiança baixa na estratégia — valide manualmente antes de usar em produção.');
  }

  if (plan.env.required.length > 0) {
    notes.push(`Configure ${plan.env.required.length} variável(is) de ambiente antes do primeiro deploy.`);
  }

  if (analysis.framework === 'next') {
    notes.push('Para Next.js, considere habilitar output: "standalone" no next.config.js para imagem menor.');
  }

  const totalFiles = docker.files.length + 1; // +1 para o próprio report

  const report = {
    generatedAt:    new Date().toISOString(),
    projectName:    analysis.projectName,
    deployTarget:   strategy,
    framework:      analysis.framework,
    packageManager: analysis.packageManager,
    docker: {
      baseImage:    docker.baseImage,
      exposedPort:  docker.exposedPort,
      multiStage:   docker.multiStage,
      filesGenerated: docker.files.map((f) => ({
        path:        f.relativePath,
        description: f.description,
      })),
    },
    notes,
    totalFilesGenerated: totalFiles,
  };

  const file: GeneratedFile = {
    relativePath: 'docker/deploy-report.json',
    content: JSON.stringify(report, null, 2),
    description: 'Relatório de deploy com metadados dos artefatos Docker gerados',
  };

  return {
    files: [file],
    totalFilesGenerated: totalFiles,
    deployTarget: strategy,
    notes,
  };
}
