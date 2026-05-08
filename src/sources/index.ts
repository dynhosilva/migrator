import fs from 'fs';
import path from 'path';
import { ProjectSource } from './types';
import { LocalFolderSource } from './local';
import { ZipSource } from './zip';
import { GitHubSource } from './github';
import { logger } from '../logger';

export { LocalFolderSource } from './local';
export { ZipSource } from './zip';
export { GitHubSource } from './github';
export { DEFAULT_IGNORE } from './ignore';
export type { ProjectFile, ProjectSource, SourceKind } from './types';
export type { IgnoreRule } from './ignore';

export function resolveSource(input: string): ProjectSource {
  const resolved = path.resolve(input);

  if (!fs.existsSync(resolved)) {
    throw new Error(`Path not found: ${resolved}`);
  }

  const stat = fs.statSync(resolved);

  if (stat.isFile()) {
    if (path.extname(resolved).toLowerCase() !== '.zip') {
      throw new Error(`File must be a .zip archive: ${resolved}`);
    }
    logger.debug(`Resolved source: ZIP`);
    return new ZipSource(resolved);
  }

  if (stat.isDirectory()) {
    const isGitRepo = fs.existsSync(path.join(resolved, '.git'));
    if (isGitRepo) {
      logger.debug(`Resolved source: GitHub (cloned repo)`);
      return new GitHubSource(resolved);
    }
    logger.debug(`Resolved source: local folder`);
    return new LocalFolderSource(resolved);
  }

  throw new Error(`Unsupported input type: ${resolved}`);
}
