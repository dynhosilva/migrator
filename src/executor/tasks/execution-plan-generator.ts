import type { ProjectContext } from '../../core/types';
import type {
  ExecutionPlanArtifacts,
  ExecutionState,
  ExecutionStep,
  GeneratedFile,
} from '../types';

export function generateExecutionPlan(
  ctx: ProjectContext,
  partial: Partial<ExecutionState>,
): ExecutionPlanArtifacts {
  const analysis = ctx.analysis;
  const pm = analysis?.packageManager ?? 'npm';
  const projectName = analysis?.projectName ?? ctx.meta.name;
  const buildCheck = partial.buildCheck;
  const dockerCheck = partial.dockerCheck;

  const pmInstall =
    pm === 'yarn' ? 'yarn install --frozen-lockfile' :
    pm === 'pnpm' ? 'pnpm install --frozen-lockfile' :
    pm === 'bun'  ? 'bun install'                    :
    'npm ci';

  const steps: ExecutionStep[] = [];

  steps.push({
    id: 'install-deps',
    command: pmInstall,
    description: `Instala dependências usando ${pm}`,
    optional: false,
  });

  if (buildCheck?.hasBuildScript) {
    steps.push({
      id: 'build',
      command: buildCheck.buildCommand ?? `${pm} run build`,
      description: 'Compila o projeto para produção',
      optional: false,
    });
  }

  if (dockerCheck?.valid) {
    const imageTag = projectName.toLowerCase().replace(/[^a-z0-9-]/g, '-');
    steps.push({
      id: 'docker-build',
      command: `docker build -t ${imageTag}:latest -f docker/Dockerfile .`,
      description: 'Constrói a imagem Docker do projeto',
      optional: false,
    });

    steps.push({
      id: 'docker-up',
      command: 'docker compose up -d',
      description: 'Inicia os serviços em modo detached',
      optional: false,
    });
  }

  const planPayload = {
    projectName,
    generatedAt: new Date().toISOString(),
    steps,
  };

  const file: GeneratedFile = {
    relativePath: 'execution/execution-plan.json',
    content: JSON.stringify(planPayload, null, 2),
    description: 'Plano de execução gerado pelo executor v1',
  };

  return { files: [file], steps };
}
