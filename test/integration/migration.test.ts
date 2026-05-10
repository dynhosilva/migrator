/**
 * Snapshot tests do resultado da migração (MigrationResult).
 *
 * Verifica a estabilidade do conteúdo dos artefatos gerados:
 * - migration-summary.json (normalizado para remover timestamps e paths)
 * - .env.example (conteúdo textual)
 * - deploy-instructions.md (estrutura)
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import path from 'path';
import fs from 'fs';
import type { ProjectContext } from '../../src/core/types';
import { runPipeline, makeTempDir, removeTempDir, fixturePath } from '../helpers/pipeline';
import { normalizeOutput, normalizeTimestamps } from '../helpers/normalize';

describe('MigrationResult — react-vite', () => {
  let outputDir: string;
  let ctx: ProjectContext;

  beforeAll(async () => {
    outputDir = makeTempDir();
    ctx = await runPipeline('react-vite', outputDir, true);
  });

  afterAll(() => removeTempDir(outputDir));

  it('gera env files com variáveis detectadas', () => {
    const envExample = fs.readFileSync(
      path.join(outputDir, 'env', '.env.example'),
      'utf-8',
    );
    expect(envExample).toContain('VITE_API_URL');
    expect(envExample).toContain('VITE_APP_TITLE');
  });

  it('relatório MigrationResult normalizado corresponde ao snapshot', () => {
    const normalized = normalizeOutput(ctx.migration!, {
      fixtureDir: fixturePath('react-vite'),
      outputDir,
    });
    expect(normalized).toMatchSnapshot();
  });

  it('migration-summary.json é JSON válido e normalizado', () => {
    const raw = fs.readFileSync(
      path.join(outputDir, 'reports', 'migration-summary.json'),
      'utf-8',
    );
    const parsed = JSON.parse(raw);
    const normalized = normalizeOutput(parsed, { outputDir });
    expect(normalized).toMatchSnapshot();
  });

  it('pendingManualSteps é vazio para projeto sem Supabase', () => {
    expect(ctx.migration!.report.pendingManualSteps).toHaveLength(0);
  });
});

describe('MigrationResult — supabase-project', () => {
  let outputDir: string;
  let ctx: ProjectContext;

  beforeAll(async () => {
    outputDir = makeTempDir();
    ctx = await runPipeline('supabase-project', outputDir, true);
  });

  afterAll(() => removeTempDir(outputDir));

  it('exporta migration SQL', () => {
    expect(ctx.migration!.migrations.count).toBe(1);
    expect(ctx.migration!.migrations.skipped).toBe(false);
  });

  it('exporta edge function', () => {
    expect(ctx.migration!.edgeFunctions.count).toBe(1);
    expect(ctx.migration!.edgeFunctions.names).toContain('hello');
  });

  it('pendingManualSteps inclui passos do Supabase', () => {
    expect(ctx.migration!.report.pendingManualSteps.length).toBeGreaterThan(0);
  });

  it('relatório supabase normalizado corresponde ao snapshot', () => {
    // Snapshot apenas dos campos estáveis (sem outputDir ou timestamps)
    const snapshot = normalizeTimestamps({
      migrations:      ctx.migration!.migrations.count,
      edgeFunctions:   ctx.migration!.edgeFunctions.count,
      edgeFunctionNames: ctx.migration!.edgeFunctions.names,
      pendingStepsCount: ctx.migration!.report.pendingManualSteps.length,
    });
    expect(snapshot).toMatchSnapshot();
  });
});
