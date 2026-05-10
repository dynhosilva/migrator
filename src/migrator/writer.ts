import fs   from 'fs';
import path from 'path';
import type { GeneratedFile } from './types';

/**
 * Única camada do migrator que realiza I/O em disco.
 *
 * Garante segurança verificando que todos os caminhos de saída estão
 * dentro do outputDir — nunca escreve fora da pasta de destino.
 */
export function writeGeneratedFiles(outputDir: string, files: GeneratedFile[]): void {
  const resolvedOutput = path.resolve(outputDir);

  for (const file of files) {
    const fullPath = path.resolve(resolvedOutput, file.relativePath);

    // Garantia de segurança: o path final deve estar dentro do outputDir
    if (!fullPath.startsWith(resolvedOutput + path.sep) && fullPath !== resolvedOutput) {
      throw new Error(
        `[migrator] Caminho de saída inválido — tentativa de escrita fora do outputDir: ${file.relativePath}`,
      );
    }

    fs.mkdirSync(path.dirname(fullPath), { recursive: true });
    fs.writeFileSync(fullPath, file.content, 'utf-8');
  }
}

/** Coleta todos os GeneratedFile[] de um MigrationResult parcial. */
export function collectAllFiles(partial: {
  env?:                { files: GeneratedFile[] };
  migrations?:         { files: GeneratedFile[] };
  edgeFunctions?:      { files: GeneratedFile[] };
  deployInstructions?: { files: GeneratedFile[] };
  folderReadmes?:      { files: GeneratedFile[] };
  report?:             { files: GeneratedFile[] };
}): GeneratedFile[] {
  return [
    ...(partial.env?.files                ?? []),
    ...(partial.migrations?.files         ?? []),
    ...(partial.edgeFunctions?.files      ?? []),
    ...(partial.deployInstructions?.files ?? []),
    ...(partial.folderReadmes?.files      ?? []),
    ...(partial.report?.files             ?? []),
  ];
}
