import type { DeployTarget } from '../planner/types';
import type { GeneratedFile } from '../migrator/types';

export type { GeneratedFile };

export interface DockerArtifacts {
  readonly files: GeneratedFile[];
  readonly baseImage: string;
  readonly exposedPort: number;
  readonly multiStage: boolean;
  readonly strategy: DeployTarget;
}

export interface DeployReport {
  readonly files: GeneratedFile[];
  readonly totalFilesGenerated: number;
  readonly deployTarget: DeployTarget;
  readonly notes: string[];
}

export interface DeployState {
  readonly projectName: string;
  readonly outputDir: string;
  readonly docker: DockerArtifacts;
  readonly report: DeployReport;
  readonly deployedAt: string;
}
