/**
 * Helper compartilhado de setup do pipeline — carrega fonte e cria contexto inicial.
 *
 * Cada route usa `createProjectContext(input)` como ponto de entrada,
 * depois executa apenas as fases necessárias para sua responsabilidade.
 */

import path from 'path';
import { resolveSource } from '../sources';
import { createContext } from '../core';
import type { ProjectContext } from '../core/types';
import { InputError, PipelineError } from './errors';
import { SandboxViolationError } from '../runtime';

/**
 * Carrega a fonte de input e retorna o ProjectContext inicial.
 *
 * Lança `InputError` se o path não puder ser resolvido.
 */
export async function createProjectContext(input: string): Promise<ProjectContext> {
  try {
    const source      = resolveSource(input);
    const files       = await source.load();
    const projectName = path.basename(input).replace(/\.zip$/i, '');
    return createContext(source, input, projectName, files);
  } catch (err) {
    throw new InputError(`Não foi possível carregar o projeto: ${(err as Error).message}`);
  }
}

/**
 * Encapsula chamadas ao engine mapeando erros para os tipos tipados da API.
 *
 * - `SandboxViolationError` → `SandboxError` (403)
 * - Qualquer outro erro → `PipelineError` (422) com a fase especificada
 */
export function wrapPhase<T>(phase: string, fn: () => T): T {
  try {
    return fn();
  } catch (err) {
    if (err instanceof SandboxViolationError) {
      throw err; // relançado — o error handler de app.ts converte para SandboxError
    }
    if (err instanceof Error) {
      throw new PipelineError(phase, err.message);
    }
    throw new PipelineError(phase, 'Erro desconhecido');
  }
}

/** Versão assíncrona de `wrapPhase` — para fases async como runtime. */
export async function wrapPhaseAsync<T>(phase: string, fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    if (err instanceof SandboxViolationError) {
      throw err;
    }
    if (err instanceof Error) {
      throw new PipelineError(phase, err.message);
    }
    throw new PipelineError(phase, 'Erro desconhecido');
  }
}

/** Resolve o outputDir: usa o valor fornecido ou gera o padrão `output/<project>`. */
export function resolveOutputDir(input: string, output?: string): string {
  if (output) return path.resolve(output);
  const projectName = path.basename(input).replace(/\.zip$/i, '');
  return path.resolve('output', projectName);
}
