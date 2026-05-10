/**
 * Testes do Runtime v1.
 *
 * Cobre:
 *   - Validação do sandbox (unit, sem execução real)
 *   - Timeout de processos
 *   - Execução de comandos seguros
 *   - Pipeline completo com execução real (falhas esperadas sem internet/Docker)
 *   - Snapshots normalizados de runtime-log.json e runtime-summary.md
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import path from 'path';
import fs from 'fs';
import type { ProjectContext } from '../../src/core/types';
import {
  runRuntimePipeline,
  makeTempDir,
  removeTempDir,
  fixturePath,
} from '../helpers/pipeline';
import { normalizeOutput, normalizeRuntimeLog } from '../helpers/normalize';
import {
  validateCommand,
  runSafeCommand,
  SandboxViolationError,
} from '../../src/runtime';

// ─── Sandbox — unit tests, sem execução ───────────────────────────────────────

describe('Sandbox — validação de comandos', () => {
  it('permite executáveis da whitelist', () => {
    expect(() => validateCommand('npm',    ['install'])).not.toThrow();
    expect(() => validateCommand('node',   ['--version'])).not.toThrow();
    expect(() => validateCommand('docker', ['build'])).not.toThrow();
    expect(() => validateCommand('pnpm',   ['install'])).not.toThrow();
    expect(() => validateCommand('yarn',   ['install'])).not.toThrow();
    expect(() => validateCommand('bun',    ['install'])).not.toThrow();
  });

  it('bloqueia rm (não está na whitelist)', () => {
    expect(() => validateCommand('rm', ['-rf', '.'])).toThrow(SandboxViolationError);
  });

  it('bloqueia bash (não está na whitelist)', () => {
    expect(() => validateCommand('bash', ['script.sh'])).toThrow(SandboxViolationError);
  });

  it('bloqueia powershell (não está na whitelist)', () => {
    expect(() => validateCommand('powershell', ['-Command', 'rm -rf /'])).toThrow(SandboxViolationError);
  });

  it('bloqueia shutdown (não está na whitelist)', () => {
    expect(() => validateCommand('shutdown', ['/s'])).toThrow(SandboxViolationError);
  });

  it('bloqueia argumentos com null byte', () => {
    expect(() => validateCommand('npm', ['install\0--evil'])).toThrow(SandboxViolationError);
  });

  it('mensagem de erro menciona executáveis permitidos', () => {
    let msg = '';
    try {
      validateCommand('rm', []);
    } catch (e) {
      msg = (e as Error).message;
    }
    expect(msg).toContain('npm');
    expect(msg).toContain('docker');
  });
});

// ─── Process runner — execução real com node (sempre disponível) ──────────────

describe('Process runner — node como comando seguro', () => {
  it('executa node --version com sucesso', async () => {
    const result = await runSafeCommand('node', ['--version'], {
      cwd:       process.cwd(),
      timeoutMs: 5000,
    });
    expect(result.exitCode).toBe(0);
    expect(result.timedOut).toBe(false);
    expect(result.stdout).toMatch(/^v\d+/);
  }, 10000);

  it('captura exit code de processo que falha', async () => {
    const result = await runSafeCommand('node', ['-e', 'process.exit(42)'], {
      cwd:       process.cwd(),
      timeoutMs: 5000,
    });
    expect(result.exitCode).toBe(42);
    expect(result.timedOut).toBe(false);
  }, 10000);

  it('captura stdout do processo', async () => {
    const result = await runSafeCommand('node', ['-e', "console.log('hello-runtime')"], {
      cwd:       process.cwd(),
      timeoutMs: 5000,
    });
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('hello-runtime');
  }, 10000);
});

// ─── Timeout handling ─────────────────────────────────────────────────────────

describe('Timeout handling', () => {
  it('interrompe processo que excede o timeout', async () => {
    const result = await runSafeCommand(
      'node',
      ['-e', 'setTimeout(() => {}, 9999)'],
      { cwd: process.cwd(), timeoutMs: 300 },
    );
    expect(result.timedOut).toBe(true);
    expect(result.exitCode).toBe(-1);
    expect(result.durationMs).toBeLessThan(2000);
  }, 10000);
});

// ─── Runtime — pipeline completo com react-vite ──────────────────────────────

describe('Runtime — react-vite (execução local com resultados esperados)', () => {
  let outputDir: string;
  let projectDir: string;
  let ctx: ProjectContext;

  beforeAll(async () => {
    outputDir  = makeTempDir();
    projectDir = makeTempDir();
    // Copia fixture para dir gravável (npm install não deve poluir a fixture original)
    fs.cpSync(fixturePath('react-vite'), projectDir, { recursive: true });

    ctx = await runRuntimePipeline('react-vite', outputDir, projectDir, true);
  }, 120000); // 2 min — npm install/docker podem ser lentos

  afterAll(() => {
    removeTempDir(outputDir);
    removeTempDir(projectDir);
  });

  it('RuntimeState presente no contexto', () => {
    expect(ctx.runtime).toBeDefined();
  });

  it('readiness tem valor válido', () => {
    expect(['success', 'partial', 'failed']).toContain(ctx.runtime!.readiness);
  });

  it('install result sempre presente (mesmo em caso de falha)', () => {
    expect(ctx.runtime!.install).toBeDefined();
    expect(ctx.runtime!.install.skipped).toBe(false);
    expect(ctx.runtime!.install.command).not.toBeNull();
  });

  it('build result presente', () => {
    expect(ctx.runtime!.build).toBeDefined();
  });

  it('dockerBuild captura resultado (sucesso ou falha controlada)', () => {
    const docker = ctx.runtime!.dockerBuild;
    expect(docker).toBeDefined();
    // Se Docker não disponível ou Dockerfile com problema, deve falhar controladamente
    if (!docker.success && !docker.skipped) {
      expect(docker.issues.length).toBeGreaterThan(0);
      expect(docker.issues[0].severity).toBe('blocker');
    }
  });

  it('artifacts validation executada', () => {
    const artifacts = ctx.runtime!.artifacts;
    expect(artifacts).toBeDefined();
    expect(artifacts.checkedPaths.length).toBeGreaterThan(0);
  });

  it('runtime-log.json gerado em outputDir/runtime/', () => {
    expect(fs.existsSync(path.join(outputDir, 'runtime', 'runtime-log.json'))).toBe(true);
  });

  it('runtime-summary.md gerado em outputDir/runtime/', () => {
    expect(fs.existsSync(path.join(outputDir, 'runtime', 'runtime-summary.md'))).toBe(true);
  });

  it('runtime-log.json tem estrutura correta', () => {
    const raw = JSON.parse(
      fs.readFileSync(path.join(outputDir, 'runtime', 'runtime-log.json'), 'utf-8'),
    );
    expect(raw).toHaveProperty('projectName', 'react-vite');
    expect(raw).toHaveProperty('generatedAt');
    expect(raw).toHaveProperty('entries');
    expect(Array.isArray(raw.entries)).toBe(true);
    // Ao menos install e build devem ter entries (não pulados)
    expect(raw.entries.length).toBeGreaterThanOrEqual(1);
  });

  it('runtime-log.json normalizado corresponde ao snapshot', () => {
    const raw = JSON.parse(
      fs.readFileSync(path.join(outputDir, 'runtime', 'runtime-log.json'), 'utf-8'),
    );
    const normalized = normalizeRuntimeLog(raw, { outputDir, projectDir });
    expect(normalized).toMatchSnapshot();
  });

  it('runtime-summary.md contém nome do projeto', () => {
    const content = fs.readFileSync(
      path.join(outputDir, 'runtime', 'runtime-summary.md'),
      'utf-8',
    );
    expect(content).toContain('react-vite');
    expect(content).toContain('## O que foi executado');
  });
});

// ─── Docker build validation sem deploy ───────────────────────────────────────

describe('Runtime — docker build sem Dockerfile (deploy não executado)', () => {
  it('dockerBuild é pulado quando Dockerfile ausente', async () => {
    const { loadFixture }    = await import('../helpers/pipeline');
    const { analyzeContext } = await import('../../src/analyzer');
    const { planContext }    = await import('../../src/planner');
    const { runProject }     = await import('../../src/runtime');

    const tmpOut = makeTempDir();
    const tmpPrj = makeTempDir();
    try {
      const ctx      = await loadFixture('react-vite');
      const analyzed = analyzeContext(ctx);
      const planned  = planContext(analyzed);

      // Sem fase de deploy — sem Dockerfile em tmpOut/docker/
      const result = await runProject(planned, tmpOut, tmpPrj);

      expect(result.dockerBuild.skipped).toBe(true);
      expect(
        result.dockerBuild.issues.some((i) => i.code === 'DOCKERFILE_NOT_FOUND'),
      ).toBe(true);
    } finally {
      removeTempDir(tmpOut);
      removeTempDir(tmpPrj);
    }
  }, 60000);
});
