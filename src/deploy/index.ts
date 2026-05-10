import path from 'path';
import type { ProjectContext } from '../core/types';
import type { DeployState } from './types';
import { DeployerRegistry }         from './registry';
import { generateDockerfile }        from './tasks/dockerfile-generator';
import { generateComposeFile }       from './tasks/compose-generator';
import { generateDockerignore }      from './tasks/dockerignore-generator';
import { generateDockerReadme }      from './tasks/docker-readme-generator';
import { generateDeployReport }      from './tasks/deploy-report-generator';
import { writeGeneratedFiles }       from '../migrator/writer';
import { withDeploy }                from '../core';
import { logger }                    from '../logger';
import type { GeneratedFile } from './types';

/**
 * Registry de tasks do deployer.
 *
 * Ordem de registro intencional:
 *   - docker: gera todos os arquivos Docker (Dockerfile, compose, dockerignore, README)
 *   - report: deve rodar por último — lê partial.docker para montar o relatório
 */
const registry = new DeployerRegistry()
  .register({
    key: 'docker',
    run: ({ ctx }) => {
      const dockerfile = generateDockerfile(ctx);
      const compose    = generateComposeFile(ctx);
      const ignore     = generateDockerignore(ctx);
      const readme     = generateDockerReadme(ctx);
      return {
        files:       [...dockerfile.files, compose, ignore, readme],
        baseImage:   dockerfile.baseImage,
        exposedPort: dockerfile.exposedPort,
        multiStage:  dockerfile.multiStage,
        strategy:    dockerfile.strategy,
      };
    },
  })
  .register({
    key: 'report',
    run: ({ ctx, partial }) => generateDeployReport(ctx, partial.docker!),
  });

function collectDeployFiles(partial: Partial<DeployState>): GeneratedFile[] {
  return [
    ...(partial.docker?.files ?? []),
    ...(partial.report?.files ?? []),
  ];
}

/**
 * Gera todos os artefatos Docker em memória e escreve para outputDir/docker/.
 *
 * Limites de segurança (v1):
 *   - Nunca modifica arquivos do projeto original
 *   - Toda escrita é restrita ao outputDir
 *   - Não executa builds, logins ou push para registries
 *
 * @param ctx       ProjectContext com analysis e plan preenchidos
 * @param outputDir Caminho onde os artefatos serão gerados (mesmo do migrator)
 */
export function deployProject(ctx: ProjectContext, outputDir: string): DeployState {
  if (!ctx.analysis) {
    throw new Error('deployProject requer análise prévia — execute analyzeContext antes.');
  }
  if (!ctx.plan) {
    throw new Error('deployProject requer planejamento prévio — execute planContext antes.');
  }

  const resolvedOutputDir = path.resolve(outputDir);
  logger.info(`Gerando artefatos Docker em: ${resolvedOutputDir}/docker`);

  const partial  = registry.run(ctx);
  const allFiles = collectDeployFiles(partial);

  writeGeneratedFiles(resolvedOutputDir, allFiles);

  logger.info(`${allFiles.length} arquivo(s) Docker gerado(s).`);

  return {
    projectName: ctx.analysis.projectName,
    outputDir:   resolvedOutputDir,
    docker:      partial.docker!,
    report:      partial.report!,
    deployedAt:  new Date().toISOString(),
  };
}

/**
 * Fase de deploy do pipeline: enriquece o ProjectContext com DeployState.
 * Requer que ctx.analysis e ctx.plan já estejam preenchidos.
 */
export function deployContext(ctx: ProjectContext, outputDir: string): ProjectContext {
  const result = deployProject(ctx, outputDir);
  return withDeploy(ctx, result);
}

export type {
  DeployState,
  DockerArtifacts,
  DeployReport,
  GeneratedFile,
} from './types';
