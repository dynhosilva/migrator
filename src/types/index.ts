export interface ZipEntry {
  path: string;
  isDirectory: boolean;
  size: number;
  content: Buffer | null;
}

export interface ParsedProject {
  name: string;
  entries: ZipEntry[];
  totalFiles: number;
  totalDirectories: number;
}

export interface MigrateOptions {
  input: string;
  output?: string;
  verbose?: boolean;
}
