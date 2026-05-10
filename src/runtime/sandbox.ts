import path from 'path';
import { runCommand } from './process';
import type { CommandResult, RunOptions } from './types';

/**
 * Whitelist de executáveis permitidos pelo runtime v1.
 *
 * Todos os outros comandos são bloqueados — isso é a camada primária de defesa.
 * A proteção secundária é shell: false no process.ts (injeção via args impossível).
 */
export const ALLOWED_EXECUTABLES = [
  'node', 'npm', 'npx', 'pnpm', 'yarn', 'bun', 'docker',
] as const;

export type AllowedExecutable = (typeof ALLOWED_EXECUTABLES)[number];

export class SandboxViolationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SandboxViolationError';
  }
}

/**
 * Valida se o comando está na whitelist e os args não contêm padrões bloqueados.
 * Lança SandboxViolationError se a validação falhar.
 *
 * Comandos bloqueados implicitamente por não estarem na whitelist:
 *   rm, del, format, shutdown, reboot, bash, powershell, sh, cmd, etc.
 */
export function validateCommand(command: string, args: string[]): void {
  const exeName = path.basename(command).toLowerCase().replace(/\.exe$/, '');

  if (!(ALLOWED_EXECUTABLES as readonly string[]).includes(exeName)) {
    throw new SandboxViolationError(
      `Executável "${command}" não está na whitelist do runtime. ` +
      `Permitidos: ${ALLOWED_EXECUTABLES.join(', ')}`,
    );
  }

  for (const arg of args) {
    if (arg.includes('\0')) {
      throw new SandboxViolationError(`Argumento contém null byte: "${arg}"`);
    }
  }
}

/**
 * Executa um comando com validação de sandbox, timeout obrigatório e shell: false.
 * Nunca passa args por shell — são enviados diretamente ao processo filho.
 */
export async function runSafeCommand(
  command: string,
  args: string[],
  options: RunOptions,
): Promise<CommandResult> {
  validateCommand(command, args);
  return runCommand(command, args, options);
}
