import { spawn } from 'child_process';
import type { CommandResult, RunOptions } from './types';

const MAX_OUTPUT_BYTES = 4096;

/**
 * Executa um processo filho sem shell, capturando stdout/stderr e respeitando timeout.
 *
 * Usa spawn com shell: false — args são passados diretamente ao SO sem interpretação
 * de shell, tornando injeção de comandos impossível independente do conteúdo dos args.
 */
export function runCommand(
  command: string,
  args: string[],
  options: RunOptions,
): Promise<CommandResult> {
  const startMs = Date.now();

  return new Promise((resolve) => {
    let proc: ReturnType<typeof spawn>;

    try {
      proc = spawn(command, args, {
        cwd:   options.cwd,
        env:   options.env ?? process.env,
        stdio: ['ignore', 'pipe', 'pipe'],
        shell: false,
      });
    } catch (spawnErr) {
      resolve({
        command,
        args,
        exitCode:   -1,
        stdout:     '',
        stderr:     (spawnErr as Error).message,
        durationMs: Date.now() - startMs,
        timedOut:   false,
      });
      return;
    }

    let stdout = '';
    let stderr = '';
    let timedOut = false;

    const timer = setTimeout(() => {
      timedOut = true;
      proc.kill('SIGTERM');
    }, options.timeoutMs);

    proc.stdout?.on('data', (chunk: Buffer) => {
      if (stdout.length < MAX_OUTPUT_BYTES) stdout += chunk.toString('utf8');
    });
    proc.stderr?.on('data', (chunk: Buffer) => {
      if (stderr.length < MAX_OUTPUT_BYTES) stderr += chunk.toString('utf8');
    });

    proc.on('close', (code) => {
      clearTimeout(timer);
      resolve({
        command,
        args,
        exitCode:   timedOut ? -1 : (code ?? -1),
        stdout:     stdout.trimEnd(),
        stderr:     stderr.trimEnd(),
        durationMs: Date.now() - startMs,
        timedOut,
      });
    });

    proc.on('error', (err) => {
      clearTimeout(timer);
      resolve({
        command,
        args,
        exitCode:   -1,
        stdout:     '',
        stderr:     err.message,
        durationMs: Date.now() - startMs,
        timedOut,
      });
    });
  });
}
