import { ProjectFile, ProjectSource } from './types';
import { IgnoreRule } from './ignore';
import { readDirRecursive } from './reader';
import { logger } from '../logger';

// Lê de um repositório GitHub já clonado localmente.
// Clone automático não está implementado — o repo deve existir no disco.
export class GitHubSource implements ProjectSource {
  readonly kind = 'github' as const;

  constructor(
    private readonly repoPath: string,
    private readonly extraIgnore: IgnoreRule[] = []
  ) {}

  describe(): string {
    return `GitHub repo (cloned): ${this.repoPath}`;
  }

  async load(): Promise<ProjectFile[]> {
    logger.info(`Loading from ${this.describe()}`);
    const files = readDirRecursive(this.repoPath, this.repoPath, this.extraIgnore);
    logger.info(`Loaded ${files.length} files`);
    return files;
  }
}
