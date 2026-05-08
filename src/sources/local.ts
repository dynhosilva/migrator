import { ProjectFile, ProjectSource } from './types';
import { IgnoreRule } from './ignore';
import { readDirRecursive } from './reader';
import { logger } from '../logger';

export class LocalFolderSource implements ProjectSource {
  readonly kind = 'local' as const;

  constructor(
    private readonly folderPath: string,
    private readonly extraIgnore: IgnoreRule[] = []
  ) {}

  describe(): string {
    return `local folder: ${this.folderPath}`;
  }

  async load(): Promise<ProjectFile[]> {
    logger.info(`Loading from ${this.describe()}`);
    const files = readDirRecursive(this.folderPath, this.folderPath, this.extraIgnore);
    logger.info(`Loaded ${files.length} files`);
    return files;
  }
}
