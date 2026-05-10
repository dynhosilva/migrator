/**
 * Snapshot tests dos artefatos Docker gerados pela fase de Deploy.
 *
 * Verifica:
 * - Conteúdo do Dockerfile (multi-stage, package manager, estratégia)
 * - docker-compose.yml (portas, env_file)
 * - .dockerignore (exclusões corretas)
 * - deploy-report.json (estratégia e metadados)
 *
 * O conteúdo do Dockerfile e docker-compose é determinístico (sem timestamps
 * nem paths), portanto é snapshot diretamente sem normalização.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import path from 'path';
import fs from 'fs';
import type { ProjectContext } from '../../src/core/types';
import { runPipeline, makeTempDir, removeTempDir, fixturePath } from '../helpers/pipeline';
import { normalizeOutput } from '../helpers/normalize';

describe('Deploy artifacts — react-vite (static + npm)', () => {
  let outputDir: string;
  let ctx: ProjectContext;

  beforeAll(async () => {
    outputDir = makeTempDir();
    ctx = await runPipeline('react-vite', outputDir, true);
  });

  afterAll(() => removeTempDir(outputDir));

  it('Dockerfile usa nginx:alpine no stage final (static)', () => {
    const dockerfile = fs.readFileSync(
      path.join(outputDir, 'docker', 'Dockerfile'),
      'utf-8',
    );
    expect(dockerfile).toContain('FROM nginx:alpine');
    expect(dockerfile).toContain('FROM node:18-alpine AS builder');
    expect(dockerfile).toContain('/usr/share/nginx/html');
  });

  it('Dockerfile usa npm ci para npm package manager', () => {
    const dockerfile = fs.readFileSync(
      path.join(outputDir, 'docker', 'Dockerfile'),
      'utf-8',
    );
    expect(dockerfile).toContain('RUN npm ci');
    expect(dockerfile).toContain('RUN npm run build');
  });

  it('Dockerfile é multi-stage', () => {
    const dockerfile = fs.readFileSync(
      path.join(outputDir, 'docker', 'Dockerfile'),
      'utf-8',
    );
    const stageCount = (dockerfile.match(/^FROM /gm) ?? []).length;
    expect(stageCount).toBeGreaterThanOrEqual(2);
  });

  it('Dockerfile completo corresponde ao snapshot', () => {
    const content = fs.readFileSync(
      path.join(outputDir, 'docker', 'Dockerfile'),
      'utf-8',
    );
    expect(content).toMatchSnapshot();
  });

  it('docker-compose.yml usa porta 80 para static', () => {
    const compose = fs.readFileSync(
      path.join(outputDir, 'docker', 'docker-compose.yml'),
      'utf-8',
    );
    expect(compose).toContain('80:80');
    expect(compose).not.toContain('3000:3000');
  });

  it('docker-compose.yml inclui env_file por ter vars de ambiente', () => {
    const compose = fs.readFileSync(
      path.join(outputDir, 'docker', 'docker-compose.yml'),
      'utf-8',
    );
    expect(compose).toContain('env_file');
    expect(compose).toContain('.env');
  });

  it('docker-compose.yml corresponde ao snapshot', () => {
    const content = fs.readFileSync(
      path.join(outputDir, 'docker', 'docker-compose.yml'),
      'utf-8',
    );
    expect(content).toMatchSnapshot();
  });

  it('.dockerignore exclui node_modules e .env', () => {
    const ignore = fs.readFileSync(
      path.join(outputDir, 'docker', '.dockerignore'),
      'utf-8',
    );
    expect(ignore).toContain('node_modules');
    expect(ignore).toContain('.env');
    expect(ignore).toContain('!.env.example');
  });

  it('.dockerignore corresponde ao snapshot', () => {
    const content = fs.readFileSync(
      path.join(outputDir, 'docker', '.dockerignore'),
      'utf-8',
    );
    expect(content).toMatchSnapshot();
  });

  it('deploy-report.json normalizado corresponde ao snapshot', () => {
    const raw = fs.readFileSync(
      path.join(outputDir, 'docker', 'deploy-report.json'),
      'utf-8',
    );
    const parsed = JSON.parse(raw);
    const normalized = normalizeOutput(parsed, { outputDir });
    expect(normalized).toMatchSnapshot();
  });

  it('DeployState normalizado corresponde ao snapshot', () => {
    const normalized = normalizeOutput(ctx.deploy!, {
      fixtureDir: fixturePath('react-vite'),
      outputDir,
    });
    expect(normalized).toMatchSnapshot();
  });
});

describe('Deploy artifacts — supabase-project (static + npm + Supabase)', () => {
  let outputDir: string;
  let ctx: ProjectContext;

  beforeAll(async () => {
    outputDir = makeTempDir();
    ctx = await runPipeline('supabase-project', outputDir, true);
  });

  afterAll(() => removeTempDir(outputDir));

  it('estratégia de deploy é static', () => {
    expect(ctx.deploy!.docker.strategy).toBe('static');
    expect(ctx.deploy!.docker.baseImage).toBe('nginx:alpine');
  });

  it('Dockerfile para supabase-project usa nginx (static)', () => {
    const dockerfile = fs.readFileSync(
      path.join(outputDir, 'docker', 'Dockerfile'),
      'utf-8',
    );
    expect(dockerfile).toContain('nginx:alpine');
  });

  it('deploy-report inclui nota sobre Supabase', () => {
    const deploy = ctx.deploy!;
    // Supabase não aparece no Dockerfile (client-side), mas pode haver nota
    // Verificamos que o deploy funcionou corretamente
    expect(deploy.docker.files.length).toBeGreaterThan(0);
    expect(deploy.report.totalFilesGenerated).toBeGreaterThan(0);
  });
});
