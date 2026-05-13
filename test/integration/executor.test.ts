/**
 * Testes do Executor.
 *
 * Verifica verificações de pré-voo, geração de artefatos e plano de execução.
 * Combina assertions comportamentais com snapshots para conteúdo determinístico.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import path from 'path';
import fs from 'fs';
import type { ProjectContext } from '../../src/core/types';
import {
  runExecutePipeline,
  makeTempDir,
  removeTempDir,
  fixturePath,
} from '../helpers/pipeline';
import { normalizeOutput } from '../helpers/normalize';

describe('Executor — react-vite (static + npm)', () => {
  let outputDir: string;
  let ctx: ProjectContext;

  beforeAll(async () => {
    outputDir = makeTempDir();
    ctx = await runExecutePipeline('react-vite', outputDir, true);
  });

  afterAll(() => removeTempDir(outputDir));

  it('execution state está presente no contexto', () => {
    expect(ctx.execution).toBeDefined();
  });

  it('Node.js está disponível no ambiente de teste', () => {
    expect(ctx.execution!.envCheck.nodeAvailable).toBe(true);
    expect(ctx.execution!.envCheck.nodeVersion).not.toBeNull();
  });

  it('npm está disponível no ambiente de teste', () => {
    expect(ctx.execution!.envCheck.packageManagerAvailable).toBe(true);
  });

  it('Node.js satisfaz requisito de versão mínima', () => {
    expect(ctx.execution!.runtimeCheck.nodeVersionOk).toBe(true);
  });

  it('artefatos Docker estão presentes após pipeline completo', () => {
    expect(ctx.execution!.dockerCheck.valid).toBe(true);
    expect(ctx.execution!.dockerCheck.missingFiles).toHaveLength(0);
  });

  it('script build está presente no react-vite', () => {
    expect(ctx.execution!.buildCheck.hasBuildScript).toBe(true);
    expect(ctx.execution!.buildCheck.buildCommand).toBe('npm run build');
  });

  it('plano de execução contém passos de install e build', () => {
    const steps = ctx.execution!.plan.steps;
    const ids = steps.map((s) => s.id);
    expect(ids).toContain('install-deps');
    expect(ids).toContain('build');
  });

  it('plano de execução contém passos docker quando artefatos válidos', () => {
    const steps = ctx.execution!.plan.steps;
    const ids = steps.map((s) => s.id);
    expect(ids).toContain('docker-build');
    expect(ids).toContain('docker-up');
  });

  it('gera arquivo execution-plan.json no outputDir', () => {
    const planPath = path.join(outputDir, 'execution', 'execution-plan.json');
    expect(fs.existsSync(planPath)).toBe(true);
  });

  it('gera arquivo dry-run.md no outputDir', () => {
    const dryRunPath = path.join(outputDir, 'execution', 'dry-run.md');
    expect(fs.existsSync(dryRunPath)).toBe(true);
  });

  it('execution-plan.json normalizado corresponde ao snapshot', () => {
    const raw = fs.readFileSync(
      path.join(outputDir, 'execution', 'execution-plan.json'),
      'utf-8',
    );
    const parsed = JSON.parse(raw);
    const normalized = normalizeOutput(parsed, { outputDir });
    expect(normalized).toMatchSnapshot();
  });

  it('dry-run.md contém comandos e seções invariantes', () => {
    const content = fs.readFileSync(
      path.join(outputDir, 'execution', 'dry-run.md'),
      'utf-8',
    );
    // Invariantes: nome do projeto, comandos de build, seções de ambiente e passos
    expect(content).toContain('react-vite');
    expect(content).toContain('npm ci');
    expect(content).toContain('npm run build');
    expect(content).toContain('docker build');
    expect(content).toContain('docker compose up');
    expect(content).toContain('## Ambiente');
    expect(content).toContain('## Passos de execução');
    expect(content).toContain('Node.js');
    // Não assertamos disponibilidade do Docker — é host-dependent
  });

  it('ExecutionState (partes invariantes) corresponde ao snapshot', () => {
    // Snapshot apenas dos campos derivados de artefatos e análise estática —
    // não do estado do host (Docker disponível ou não).
    const { buildCheck, dockerCheck, runtimeCheck, plan } = ctx.execution!;
    const normalized = normalizeOutput(
      { buildCheck, dockerCheck, runtimeCheck, plan },
      { outputDir },
    );
    expect(normalized).toMatchSnapshot();
  });
});

describe('Executor — docker artifact validation sem deploy', () => {
  it('detecta deploy ausente quando ctx não tem deploy', async () => {
    const { loadFixture } = await import('../helpers/pipeline');
    const { analyzeContext }  = await import('../../src/analyzer');
    const { planContext }     = await import('../../src/planner');
    const { executeProject }  = await import('../../src/executor');

    const tmpDir = makeTempDir();
    try {
      const ctx      = await loadFixture('react-vite');
      const analyzed = analyzeContext(ctx);
      const planned  = planContext(analyzed);

      // Sem fase de deploy — executeProject deve detectar artefatos ausentes
      const result = executeProject(planned, tmpDir);
      expect(result.dockerCheck.valid).toBe(false);
      expect(result.dockerCheck.issues.some((i) => i.code === 'DOCKER_ARTIFACTS_NOT_GENERATED')).toBe(true);
      expect(result.summary.readiness).toBe('blocked');
    } finally {
      removeTempDir(tmpDir);
    }
  });
});
