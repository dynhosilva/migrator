import AdmZip from 'adm-zip';
import path from 'path';
import { ZipEntry, ParsedProject } from '../types';
import { logger } from '../logger';

export function parseZip(zipPath: string): ParsedProject {
  logger.info(`Parsing ZIP: ${zipPath}`);

  const zip = new AdmZip(zipPath);
  const rawEntries = zip.getEntries();

  const entries: ZipEntry[] = rawEntries.map((entry) => {
    logger.debug(`Entry: ${entry.entryName} (dir: ${entry.isDirectory})`);
    return {
      path: entry.entryName,
      isDirectory: entry.isDirectory,
      size: entry.header.size,
      content: entry.isDirectory ? null : entry.getData(),
    };
  });

  const files = entries.filter((e) => !e.isDirectory);
  const dirs  = entries.filter((e) => e.isDirectory);
  const name  = path.basename(zipPath, path.extname(zipPath));

  logger.info(`Found ${files.length} files and ${dirs.length} directories`);

  return { name, entries, totalFiles: files.length, totalDirectories: dirs.length };
}
