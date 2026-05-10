import type { ProjectContext } from '../../core/types';
import type { TransferFile, TransferPlanResult, RemoteIssue } from '../types';

interface KnownArtifact {
  localPath: string;
  estimatedSizeKB: number;
  optional: boolean;
}

const ALWAYS_TRANSFER: KnownArtifact[] = [
  { localPath: 'docker/Dockerfile',        estimatedSizeKB: 2,   optional: false },
  { localPath: 'docker/docker-compose.yml', estimatedSizeKB: 1,  optional: false },
  { localPath: 'docker/.dockerignore',     estimatedSizeKB: 1,   optional: false },
  { localPath: 'env/.env.example',         estimatedSizeKB: 1,   optional: false },
  { localPath: 'env/.env.production.example', estimatedSizeKB: 1, optional: true },
  { localPath: 'reports/migration-summary.json', estimatedSizeKB: 5, optional: true },
];

const SUPABASE_ARTIFACTS: KnownArtifact[] = [
  { localPath: 'supabase/',                estimatedSizeKB: 10,  optional: true },
];

export function planTransfer(
  ctx: ProjectContext,
  remotePath: string,
): TransferPlanResult {
  const issues: RemoteIssue[] = [];
  const hasSupabase = ctx.analysis?.supabase.detected ?? false;
  const hasDeploy   = !!ctx.deploy;

  const artifacts: KnownArtifact[] = [
    ...ALWAYS_TRANSFER,
    ...(hasSupabase ? SUPABASE_ARTIFACTS : []),
  ];

  if (!hasDeploy) {
    issues.push({
      code:       'TRANSFER_NO_DOCKER_ARTIFACTS',
      message:    'Fase de deploy não executada — artefatos Docker não gerados ainda.',
      suggestion: 'Execute o comando deploy antes do remote para gerar os artefatos Docker.',
      severity:   'warning',
    });
  }

  const files: TransferFile[] = artifacts.map((a) => ({
    localPath:          a.localPath,
    remotePath:         `${remotePath}/${a.localPath}`,
    estimatedSizeKB:    a.estimatedSizeKB,
  }));

  const totalEstimatedSizeKB = files.reduce((sum, f) => sum + f.estimatedSizeKB, 0);

  return { files, totalEstimatedSizeKB, issues };
}
