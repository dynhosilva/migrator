/**
 * Representa um único arquivo gerado pelo migrator.
 * Toda saída do migrator é expressa como GeneratedFile[] — puro conteúdo,
 * sem I/O. O writer (writer.ts) é a única camada que toca o disco.
 */
export interface GeneratedFile {
  readonly relativePath: string;   // relativo ao outputDir, ex: "env/.env.example"
  readonly content: string;        // conteúdo textual do arquivo
  readonly description: string;    // descrição legível do propósito do arquivo
}

// ── Resultados por task ────────────────────────────────────────────────────

export interface EnvArtifacts {
  readonly files: GeneratedFile[];
}

export interface MigrationExportArtifacts {
  readonly files: GeneratedFile[];
  readonly count: number;
  readonly skipped: boolean;   // true se não há migrations para exportar
}

export interface EdgeFunctionArtifacts {
  readonly files: GeneratedFile[];
  readonly count: number;
  readonly names: string[];
  readonly skipped: boolean;   // true se não há edge functions para exportar
}

export interface DeployInstructionsArtifact {
  readonly files: GeneratedFile[];
}

export interface FolderReadmeArtifacts {
  readonly files: GeneratedFile[];
}

export interface MigrationReportArtifact {
  readonly files: GeneratedFile[];
  readonly totalFilesGenerated: number;
  readonly pendingManualSteps: string[];
  readonly warnings: string[];
}

// ── Resultado agregado da fase de migração ─────────────────────────────────

/**
 * Resultado completo da fase de migração.
 *
 * Cada campo é preenchido por uma task independente via MigratorRegistry.
 * O campo `outputDir` e metadados são preenchidos por `migrateProject()`.
 *
 * Contrato com fases futuras:
 *   - `migrations.files` → migrator v2 pode executar as migrations
 *   - `edgeFunctions.files` → deploy pode publicar as edge functions
 *   - `report.pendingManualSteps` → orquestrador pode listar pendências ao usuário
 */
export interface MigrationResult {
  readonly projectName: string;
  readonly outputDir: string;               // caminho absoluto do diretório de saída
  readonly env: EnvArtifacts;
  readonly migrations: MigrationExportArtifacts;
  readonly edgeFunctions: EdgeFunctionArtifacts;
  readonly deployInstructions: DeployInstructionsArtifact;
  readonly folderReadmes: FolderReadmeArtifacts;
  readonly report: MigrationReportArtifact;
  readonly migratedAt: string;
}
