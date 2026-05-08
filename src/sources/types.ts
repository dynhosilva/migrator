export interface ProjectFile {
  relativePath: string;
  content: Buffer;
  size: number;
}

export type SourceKind = 'local' | 'zip' | 'github';

export interface ProjectSource {
  readonly kind: SourceKind;
  load(): Promise<ProjectFile[]>;
  describe(): string;
}
