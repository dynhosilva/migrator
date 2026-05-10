import type { ProjectContext } from '../../core/types';
import type { RemoteState, RemoteConfig, RemoteExecutionPlanArtifacts, GeneratedFile } from '../types';
import { remoteStep, localStep } from '../planner';

export function planRemoteExecution(
  ctx: ProjectContext,
  config: RemoteConfig,
  partial: Partial<RemoteState>,
): RemoteExecutionPlanArtifacts {
  const projectName  = ctx.meta.name;
  const { sshConfig, remotePath } = config;
  const userHost     = `${sshConfig.user}@${sshConfig.host}`;
  const keyFlag      = `-i ${sshConfig.keyPath}`;
  const port         = ctx.deploy?.docker.exposedPort ?? 80;
  const transferPlan = partial.transferPlan;
  const fileList     = transferPlan?.files.map((f) => f.localPath).join(' ') ?? '.';
  const fileCount    = transferPlan?.files.length ?? 0;

  const steps = [
    remoteStep(
      'create-remote-dirs',
      `ssh ${userHost} ${keyFlag} "mkdir -p ${remotePath}/docker ${remotePath}/env"`,
      'Cria estrutura de diretórios no servidor remoto',
      { risk: 'low' },
    ),
    localStep(
      'transfer-files',
      `rsync -avz -e "ssh ${keyFlag}" ${fileList} ${userHost}:${remotePath}/`,
      `Transfere ${fileCount} arquivo(s) para o servidor remoto`,
      { requires: ['create-remote-dirs'], risk: 'medium' },
    ),
    remoteStep(
      'docker-build-remote',
      `ssh ${userHost} ${keyFlag} "cd ${remotePath} && docker build -f docker/Dockerfile -t ${projectName}:latest ."`,
      'Constrói imagem Docker no servidor remoto',
      { requires: ['transfer-files'], risk: 'medium' },
    ),
    remoteStep(
      'docker-compose-up',
      `ssh ${userHost} ${keyFlag} "cd ${remotePath} && docker compose -f docker/docker-compose.yml up -d"`,
      'Inicia os containers via Docker Compose',
      { requires: ['docker-build-remote'], risk: 'high' },
    ),
    remoteStep(
      'verify-health',
      `ssh ${userHost} ${keyFlag} "curl -sf http://localhost:${port}/ && echo OK"`,
      'Verifica que a aplicação está respondendo na porta esperada',
      { requires: ['docker-compose-up'], risk: 'low' },
    ),
  ];

  const planJson = JSON.stringify(
    { projectName, remotePath, userHost, steps, generatedAt: new Date().toISOString() },
    null,
    2,
  );

  const files: GeneratedFile[] = [
    {
      relativePath: 'remote/remote-execution-plan.json',
      content:      planJson,
      description:  'Plano de execução remota com passos ordenados',
    },
  ];

  return { files, steps };
}
