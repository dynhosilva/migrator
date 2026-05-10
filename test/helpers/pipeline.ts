/**
 * Helpers de pipeline para testes de integração.
 *
 * Todas as funções são puras do ponto de vista do teste:
 * - Fixtures são somente leitura (nunca modificadas)
 * - Output vai para diretórios temporários do SO
 * - Nenhuma chamada de rede ou API externa
 */

import path from 'path';
import fs from 'fs';
import os from 'os';
import { createContext }   from '../../src/core';
import { resolveSource }   from '../../src/sources';
import { analyzeContext }  from '../../src/analyzer';
import { planContext }     from '../../src/planner';
import { validateContext } from '../../src/validator';
import { migrateContext }  from '../../src/migrator';
import { deployContext }   from '../../src/deploy';
import { executeContext }  from '../../src/executor';
import type { ProjectContext } from '../../src/core/types';

/** Caminho absoluto para o diretório de fixtures. */
export const FIXTURES_DIR = path.resolve(__dirname, '../fixtures');

/** Retorna o caminho absoluto de um fixture pelo nome. */
export function fixturePath(name: string): string {
  return path.join(FIXTURES_DIR, name);
}

/** Cria um diretório temporário isolado para output de testes. */
export function makeTempDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'lovable-test-'));
}

/** Remove um diretório temporário após o teste. */
export function removeTempDir(dir: string): void {
  fs.rmSync(dir, { recursive: true, force: true });
}

/** Carrega um fixture e retorna o ProjectContext inicial (sem análise). */
export async function loadFixture(name: string): Promise<ProjectContext> {
  const fp     = fixturePath(name);
  const source = resolveSource(fp);
  const files  = await source.load();
  return createContext(source, fp, name, files);
}

/** Executa apenas a fase de análise sobre um fixture. */
export async function runAnalysis(name: string): Promise<ProjectContext> {
  const ctx = await loadFixture(name);
  return analyzeContext(ctx);
}

/** Executa analyze → plan → validate sobre um fixture. */
export async function runValidation(name: string): Promise<ProjectContext> {
  const ctx      = await loadFixture(name);
  const analyzed = analyzeContext(ctx);
  const planned  = planContext(analyzed);
  return validateContext(planned);
}

/**
 * Executa o pipeline completo: analyze → plan → validate → migrate → deploy.
 *
 * @param name      Nome do fixture (deve existir em test/fixtures/)
 * @param outputDir Diretório de saída (use makeTempDir() para isolamento)
 * @param force     Se true, prossegue mesmo com issues críticos de validação
 */
export async function runPipeline(
  name: string,
  outputDir: string,
  force = false,
): Promise<ProjectContext> {
  const ctx       = await loadFixture(name);
  const analyzed  = analyzeContext(ctx);
  const planned   = planContext(analyzed);
  const validated = validateContext(planned);

  if (!validated.validation?.safeToMigrate && !force) {
    const codes = validated.validation?.blockingIssues.map((i) => i.code).join(', ');
    throw new Error(`Validação bloqueou o pipeline: ${codes}`);
  }

  const migrated = migrateContext(validated, outputDir);
  return deployContext(migrated, outputDir);
}

/**
 * Executa o pipeline completo incluindo a fase de execução:
 * analyze → plan → validate → migrate → deploy → execute.
 */
export async function runExecutePipeline(
  name: string,
  outputDir: string,
  force = false,
): Promise<ProjectContext> {
  const deployed = await runPipeline(name, outputDir, force);
  return executeContext(deployed, outputDir);
}
