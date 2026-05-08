import AdmZip from 'adm-zip';
import { ProjectFile, ProjectSource } from './types';
import { IgnoreRule, createIgnoreFilter, isPathIgnored } from './ignore';
import { logger } from '../logger';

export class ZipSource implements ProjectSource {
  readonly kind = 'zip' as const;

  constructor(
    private readonly zipPath: string,
    private readonly extraIgnore: IgnoreRule[] = []
  ) {}

  describe(): string {
    return `ZIP archive: ${this.zipPath}`;
  }

  async load(): Promise<ProjectFile[]> {
    logger.info(`Loading from ${this.describe()}`);

    const isIgnored = createIgnoreFilter(this.extraIgnore);
    const files: ProjectFile[] = [];

    for (const entry of new AdmZip(this.zipPath).getEntries()) {
      if (entry.isDirectory) continue;

      const relativePath = entry.entryName.replace(/\\/g, '/');

      if (isPathIgnored(relativePath, isIgnored)) {
        logger.debug(`Ignored: ${relativePath}`);
        continue;
      }

      const content = entry.getData();
      logger.debug(`Entry: ${relativePath} (${content.length}b)`);
      files.push({ relativePath, content, size: content.length });
    }

    logger.info(`Loaded ${files.length} files`);
    return files;
  }
}
