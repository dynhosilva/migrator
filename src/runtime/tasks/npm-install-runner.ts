import type { ProjectContext } from '../../core/types';
import type { NpmInstallResult, RuntimeIssue } from '../types';
import { runSafeCommand } from '../sandbox';

interface PmConfig {
  cmd: string;
  args: string[];
}

const PM_INSTALL: Record<string, PmConfig> = {
  npm:  { cmd: 'npm',  args: ['install'] },
  yarn: { cmd: 'yarn', args: ['install', '--frozen-lockfile'] },
  pnpm: { cmd: 'pnpm', args: ['install', '--frozen-lockfile'] },
  bun:  { cmd: 'bun',  args: ['install'] },
};

const INSTALL_TIMEOUT_MS = 5 * 60 * 1000;

export async function runNpmInstall(
  ctx: ProjectContext,
  projectDir: string,
): Promise<NpmInstallResult> {
  const pm  = ctx.analysis?.packageManager ?? 'npm';
  const cfg = PM_INSTALL[pm] ?? PM_INSTALL['npm'];
  const issues: RuntimeIssue[] = [];

  const result = await runSafeCommand(cfg.cmd, cfg.args, {
    cwd:       projectDir,
    timeoutMs: INSTALL_TIMEOUT_MS,
  });

  const success = result.exitCode === 0 && !result.timedOut;

  if (result.timedOut) {
    issues.push({
      code:       'INSTALL_TIMEOUT',
      message:    `${pm} install excedeu o timeout de ${INSTALL_TIMEOUT_MS / 1000}s.`,
      suggestion: 'Verifique a conexão com a internet e o registro npm.',
      severity:   'blocker',
    });
  } else if (!success) {
    issues.push({
      code:       'INSTALL_FAILED',
      message:    `${pm} install falhou com exit code ${result.exitCode}.`,
      suggestion: 'Verifique o package.json e a conexão com a internet.',
      severity:   'blocker',
    });
  }

  return { success, skipped: false, command: result, issues };
}
