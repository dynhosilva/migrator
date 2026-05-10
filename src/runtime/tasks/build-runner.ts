import fs from 'fs';
import path from 'path';
import type { ProjectContext } from '../../core/types';
import type { BuildResult, RuntimeIssue } from '../types';
import { runSafeCommand } from '../sandbox';

const BUILD_OUTPUT: Record<string, string> = {
  vite:    'dist',
  cra:     'build',
  webpack: 'dist',
  next:    '.next',
  unknown: 'dist',
};

const BUILD_TIMEOUT_MS = 3 * 60 * 1000;

export async function runBuild(
  ctx: ProjectContext,
  projectDir: string,
): Promise<BuildResult> {
  const pm          = ctx.analysis?.packageManager ?? 'npm';
  const buildSystem = ctx.analysis?.buildSystem    ?? 'unknown';
  const hasBuild    = !!(ctx.analysis?.packageJson?.scripts?.['build']);
  const issues: RuntimeIssue[] = [];

  if (!hasBuild) {
    issues.push({
      code:     'BUILD_SCRIPT_MISSING',
      message:  'Script "build" não encontrado — build pulado.',
      severity: 'warning',
    });
    return { success: false, skipped: true, command: null, artifactDir: null, artifactExists: false, issues };
  }

  const result = await runSafeCommand(pm, ['run', 'build'], {
    cwd:       projectDir,
    timeoutMs: BUILD_TIMEOUT_MS,
  });

  const success = result.exitCode === 0 && !result.timedOut;

  if (result.timedOut) {
    issues.push({
      code:     'BUILD_TIMEOUT',
      message:  `Build excedeu o timeout de ${BUILD_TIMEOUT_MS / 1000}s.`,
      severity: 'blocker',
    });
  } else if (!success) {
    issues.push({
      code:       'BUILD_FAILED',
      message:    `Build falhou com exit code ${result.exitCode}.`,
      suggestion: 'Verifique os erros de compilação no log de runtime.',
      severity:   'blocker',
    });
  }

  const artifactDir  = BUILD_OUTPUT[buildSystem] ?? 'dist';
  const artifactPath = path.join(projectDir, artifactDir);
  const artifactExists = fs.existsSync(artifactPath);

  if (success && !artifactExists) {
    issues.push({
      code:     'BUILD_ARTIFACTS_MISSING',
      message:  `Build completou mas ${artifactDir}/ não foi encontrado em projectDir.`,
      severity: 'warning',
    });
  }

  return { success, skipped: false, command: result, artifactDir, artifactExists, issues };
}
