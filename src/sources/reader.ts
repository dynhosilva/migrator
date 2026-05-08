import fs from 'fs';
import path from 'path';
import { ProjectFile } from './types';
import { IgnoreRule, createIgnoreFilter } from './ignore';
import { logger } from '../logger';

export function readDirRecursive(
  basePath: string,
  currentPath: string,
  extraIgnore: IgnoreRule[] = []
): ProjectFile[] {
  // Cria o filtro uma única vez e repassa para a função recursiva.
  const isIgnored = createIgnoreFilter(extraIgnore);
  return walk(basePath, currentPath, isIgnored);
}

function walk(
  basePath: string,
  currentPath: string,
  isIgnored: (segment: string) => boolean
): ProjectFile[] {
  const entries = fs.readdirSync(currentPath, { withFileTypes: true });
  const files: ProjectFile[] = [];

  for (const entry of entries) {
    if (isIgnored(entry.name)) {
      logger.debug(`Ignored: ${entry.name}`);
      continue;
    }

    const fullPath = path.join(currentPath, entry.name);

    if (entry.isDirectory()) {
      files.push(...walk(basePath, fullPath, isIgnored));
    } else {
      const content = fs.readFileSync(fullPath);
      const relativePath = path.relative(basePath, fullPath).replace(/\\/g, '/');
      logger.debug(`File: ${relativePath} (${content.length}b)`);
      files.push({ relativePath, content, size: content.length });
    }
  }

  return files;
}
