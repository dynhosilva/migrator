/**
 * Teste de integração: pipeline completo analyze → plan → validate → migrate → deploy.
 *
 * Verifica que o pipeline executa sem erros e gera todos os artefatos esperados
 * no diretório de saída. Usa force=true para contornar vars de ambiente ausentes
 * (comportamento esperado em ambiente de CI sem segredos reais).
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import path from 'path';
import fs from 'fs';
import type { ProjectContext } from '../../src/core/types';
import { runPipeline, makeTempDir, removeTempDir, fixturePath } from '../helpers/pipeline';

describe('Pipeline completo — react-vite', () => {
  let outputDir: string;
  let ctx: ProjectContext;

  beforeAll(async () => {
    outputDir = makeTempDir();
    ctx = await runPipeline('react-vite', outputDir, true);
  });

  afterAll(() => {
    removeTempDir(outputDir);
  });

  it('executa sem erros e preenche todos os campos do contexto', () => {
    expect(ctx.analysis).toBeDefined();
    expect(ctx.plan).toBeDefined();
    expect(ctx.validation).toBeDefined();
    expect(ctx.migration).toBeDefined();
    expect(ctx.deploy).toBeDefined();
  });

  it('detecta framework react e build system vite', () => {
    expect(ctx.analysis!.framework).toBe('react');
    expect(ctx.analysis!.buildSystem).toBe('vite');
    expect(ctx.analysis!.packageManager).toBe('npm');
  });

  it('gera artefatos de migração em disco', () => {
    expect(fs.existsSync(path.join(outputDir, 'env', '.env.example'))).toBe(true);
    expect(fs.existsSync(path.join(outputDir, 'env', '.env.production.example'))).toBe(true);
    expect(fs.existsSync(path.join(outputDir, 'deploy', 'deploy-instructions.md'))).toBe(true);
    expect(fs.existsSync(path.join(outputDir, 'reports', 'migration-summary.json'))).toBe(true);
  });

  it('gera artefatos Docker em disco', () => {
    expect(fs.existsSync(path.join(outputDir, 'docker', 'Dockerfile'))).toBe(true);
    expect(fs.existsSync(path.join(outputDir, 'docker', 'docker-compose.yml'))).toBe(true);
    expect(fs.existsSync(path.join(outputDir, 'docker', '.dockerignore'))).toBe(true);
    expect(fs.existsSync(path.join(outputDir, 'docker', 'README.md'))).toBe(true);
  });

  it('contagem de artefatos gerados é maior que zero', () => {
    expect(ctx.migration!.report.totalFilesGenerated).toBeGreaterThan(0);
    expect(ctx.deploy!.report.totalFilesGenerated).toBeGreaterThan(0);
    expect(ctx.deploy!.docker.files.length).toBeGreaterThan(0);
  });

  it('estratégia de deploy é static para React+Vite', () => {
    expect(ctx.plan!.deployStrategy.recommended).toBe('static');
    expect(ctx.deploy!.docker.strategy).toBe('static');
    expect(ctx.deploy!.docker.baseImage).toBe('nginx:alpine');
    expect(ctx.deploy!.docker.exposedPort).toBe(80);
  });
});

describe('Pipeline completo — supabase-project', () => {
  let outputDir: string;
  let ctx: ProjectContext;

  beforeAll(async () => {
    outputDir = makeTempDir();
    ctx = await runPipeline('supabase-project', outputDir, true);
  });

  afterAll(() => {
    removeTempDir(outputDir);
  });

  it('detecta Supabase e exporta migrations', () => {
    expect(ctx.analysis!.supabase.detected).toBe(true);
    expect(ctx.analysis!.supabase.migrations.count).toBe(1);
    expect(ctx.analysis!.supabase.edgeFunctions.count).toBe(1);
    expect(ctx.analysis!.supabase.edgeFunctions.names).toContain('hello');
  });

  it('gera migration SQL no output', () => {
    const migFile = path.join(outputDir, 'supabase', 'migrations', '001_create_profiles.sql');
    expect(fs.existsSync(migFile)).toBe(true);
  });

  it('gera edge function no output', () => {
    const edgePath = path.join(outputDir, 'supabase', 'functions', 'hello', 'index.ts');
    expect(fs.existsSync(edgePath)).toBe(true);
  });

  it('supabase fixture não existe no caminho errado', () => {
    expect(fs.existsSync(fixturePath('supabase-project'))).toBe(true);
  });
});
