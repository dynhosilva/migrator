import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { ProjectContext } from '../../src/core/types';
import {
  runCicdPipeline,
  makeTempDir,
  removeTempDir,
} from '../helpers/pipeline';

describe('CICD — react-vite (scaffolding)', () => {
  let outputDir: string;
  let ctx: ProjectContext;

  beforeAll(async () => {
    outputDir = makeTempDir();
    ctx = await runCicdPipeline('react-vite', outputDir, true);
  });

  afterAll(() => removeTempDir(outputDir));

  it('cicd state está presente no contexto', () => {
    expect(ctx.cicd).toBeDefined();
  });

  it('readiness é ready (scaffolding sem issues)', () => {
    expect(ctx.cicd!.readiness).toBe('ready');
  });

  it('ci summary está presente', () => {
    expect(ctx.cicd!.ci).toBeDefined();
    expect(Array.isArray(ctx.cicd!.ci.files)).toBe(true);
    expect(Array.isArray(ctx.cicd!.ci.issues)).toBe(true);
  });

  it('release summary está presente', () => {
    expect(ctx.cicd!.release).toBeDefined();
    expect(Array.isArray(ctx.cicd!.release.files)).toBe(true);
    expect(Array.isArray(ctx.cicd!.release.issues)).toBe(true);
  });

  it('projectName corresponde ao fixture', () => {
    expect(ctx.cicd!.projectName).toBe('react-vite');
  });

  it('fases anteriores do pipeline estão intactas', () => {
    expect(ctx.analysis).toBeDefined();
    expect(ctx.plan).toBeDefined();
    expect(ctx.validation).toBeDefined();
    expect(ctx.migration).toBeDefined();
    expect(ctx.deploy).toBeDefined();
  });
});
