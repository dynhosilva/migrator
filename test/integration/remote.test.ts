/**
 * Testes de integração do módulo remote v1.
 *
 * Verifica:
 * - Compatibilidade de host (OS, Docker, Node, disco, portas)
 * - Validação de configuração SSH (formato — sem conexão real)
 * - Verificação de estratégia de deploy
 * - Plano de execução remota (snapshot do JSON)
 * - Dry-run legível (snapshot do Markdown)
 *
 * Nenhum teste abre conexão SSH real ou executa comandos remotos.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import path from 'path';
import fs from 'fs';
import type { ProjectContext } from '../../src/core/types';
import { checkHostCompatibility }  from '../../src/remote/tasks/host-compatibility-checker';
import { validateSshConfig }       from '../../src/remote/tasks/ssh-config-validator';
import { checkDeploymentStrategy } from '../../src/remote/tasks/deployment-strategy-checker';
import { mergeHostProfile, DEFAULT_HOST_PROFILE } from '../../src/remote/host';
import { mergeSshConfig, DEFAULT_SSH_CONFIG } from '../../src/remote/ssh';
import { runRemotePipeline, makeTempDir, removeTempDir } from '../helpers/pipeline';
import { normalizeOutput } from '../helpers/normalize';

// ─── Host compatibility ───────────────────────────────────────────────────────

describe('Remote — Host compatibility', () => {
  const baseCtx = { meta: { name: 'test' }, source: {}, files: [] } as unknown as ProjectContext;

  it('aceita host Ubuntu com Docker disponível', () => {
    const result = checkHostCompatibility(baseCtx, DEFAULT_HOST_PROFILE);
    expect(result.compatible).toBe(true);
    expect(result.issues.filter((i) => i.severity === 'blocker')).toHaveLength(0);
  });

  it('bloqueia quando Docker não está disponível', () => {
    const profile = mergeHostProfile({ dockerAvailable: false });
    const result = checkHostCompatibility(baseCtx, profile);
    expect(result.compatible).toBe(false);
    const blocker = result.issues.find((i) => i.code === 'HOST_DOCKER_MISSING');
    expect(blocker).toBeDefined();
    expect(blocker?.severity).toBe('blocker');
  });

  it('bloqueia quando versão do Node.js é incompatível (< 18)', () => {
    const profile = mergeHostProfile({ nodeVersion: 'v16.20.0' });
    const result = checkHostCompatibility(baseCtx, profile);
    expect(result.compatible).toBe(false);
    const blocker = result.issues.find((i) => i.code === 'HOST_NODE_VERSION_INCOMPATIBLE');
    expect(blocker).toBeDefined();
    expect(blocker?.severity).toBe('blocker');
  });

  it('bloqueia quando espaço em disco é insuficiente (< 2GB)', () => {
    const profile = mergeHostProfile({ diskSpaceGB: 1 });
    const result = checkHostCompatibility(baseCtx, profile);
    expect(result.compatible).toBe(false);
    const blocker = result.issues.find((i) => i.code === 'HOST_DISK_SPACE_LOW');
    expect(blocker).toBeDefined();
    expect(blocker?.severity).toBe('blocker');
  });

  it('avisa quando OS do host é desconhecido', () => {
    const profile = mergeHostProfile({ os: 'unknown' });
    const result = checkHostCompatibility(baseCtx, profile);
    const warning = result.issues.find((i) => i.code === 'HOST_OS_UNKNOWN');
    expect(warning?.severity).toBe('warning');
  });

  it('avisa quando porta necessária não está disponível', () => {
    const profile = mergeHostProfile({ availablePorts: [22, 443] });
    const result = checkHostCompatibility(baseCtx, profile);
    const warning = result.issues.find((i) => i.code === 'HOST_PORT_UNAVAILABLE');
    expect(warning?.severity).toBe('warning');
  });

  it('avisa quando Node.js não está presente no host', () => {
    const profile = mergeHostProfile({ nodeVersion: null });
    const result = checkHostCompatibility(baseCtx, profile);
    const warning = result.issues.find((i) => i.code === 'HOST_NODE_MISSING');
    expect(warning?.severity).toBe('warning');
  });
});

// ─── SSH config validation ────────────────────────────────────────────────────

describe('Remote — SSH config validation', () => {
  it('aceita configuração SSH padrão válida', () => {
    const result = validateSshConfig(DEFAULT_SSH_CONFIG);
    expect(result.valid).toBe(true);
    expect(result.issues.filter((i) => i.severity === 'blocker')).toHaveLength(0);
  });

  it('bloqueia hostname inválido', () => {
    const config = mergeSshConfig({ host: '!!!invalid!!!host' });
    const result = validateSshConfig(config);
    expect(result.valid).toBe(false);
    const blocker = result.issues.find((i) => i.code === 'SSH_HOST_INVALID');
    expect(blocker).toBeDefined();
  });

  it('bloqueia porta fora do intervalo válido', () => {
    const config = mergeSshConfig({ port: 0 });
    const result = validateSshConfig(config);
    expect(result.valid).toBe(false);
    const blocker = result.issues.find((i) => i.code === 'SSH_PORT_INVALID');
    expect(blocker).toBeDefined();
  });

  it('bloqueia porta maior que 65535', () => {
    const config = mergeSshConfig({ port: 70000 });
    const result = validateSshConfig(config);
    expect(result.valid).toBe(false);
    const blocker = result.issues.find((i) => i.code === 'SSH_PORT_INVALID');
    expect(blocker).toBeDefined();
  });

  it('bloqueia usuário SSH vazio', () => {
    const config = mergeSshConfig({ user: '' });
    const result = validateSshConfig(config);
    expect(result.valid).toBe(false);
    const blocker = result.issues.find((i) => i.code === 'SSH_USER_MISSING');
    expect(blocker).toBeDefined();
  });

  it('bloqueia auth por chave sem keyPath', () => {
    const config = mergeSshConfig({ authStrategy: 'key', keyPath: '' });
    const result = validateSshConfig(config);
    expect(result.valid).toBe(false);
    const blocker = result.issues.find((i) => i.code === 'SSH_KEY_PATH_MISSING');
    expect(blocker).toBeDefined();
  });

  it('aceita endereço IPv4 como host', () => {
    const config = mergeSshConfig({ host: '192.168.1.100' });
    const result = validateSshConfig(config);
    expect(result.valid).toBe(true);
  });
});

// ─── Deployment strategy checker ─────────────────────────────────────────────

describe('Remote — Deployment strategy checker', () => {
  const baseCtx = {
    meta: { name: 'test' },
    source: {},
    files: [],
    plan: { deployStrategy: { recommended: 'static' } },
  } as unknown as ProjectContext;

  it('marca como compatível quando Docker está disponível e estratégia é static', () => {
    const result = checkDeploymentStrategy(baseCtx, DEFAULT_HOST_PROFILE);
    expect(result.compatible).toBe(true);
    expect(result.strategy).toBe('static');
    expect(result.requirements.length).toBeGreaterThan(0);
  });

  it('bloqueia quando Docker não está disponível no host', () => {
    const profile = mergeHostProfile({ dockerAvailable: false });
    const result = checkDeploymentStrategy(baseCtx, profile);
    expect(result.compatible).toBe(false);
    const blocker = result.issues.find((i) => i.code === 'REMOTE_DOCKER_REQUIRED');
    expect(blocker?.severity).toBe('blocker');
  });

  it('bloqueia quando estratégia é desconhecida', () => {
    const ctx = {
      meta: { name: 'test' },
      source: {},
      files: [],
    } as unknown as ProjectContext;
    const result = checkDeploymentStrategy(ctx, DEFAULT_HOST_PROFILE);
    expect(result.compatible).toBe(false);
    const blocker = result.issues.find((i) => i.code === 'REMOTE_STRATEGY_UNKNOWN');
    expect(blocker?.severity).toBe('blocker');
  });

  it('inclui requisitos de deploy na resposta', () => {
    const result = checkDeploymentStrategy(baseCtx, DEFAULT_HOST_PROFILE);
    expect(result.requirements).toContain('Docker Engine');
  });
});

// ─── Full pipeline integration ────────────────────────────────────────────────

describe('Remote — Pipeline completo (react-vite)', () => {
  let outputDir: string;
  let ctx: ProjectContext;

  beforeAll(async () => {
    outputDir = makeTempDir();
    ctx = await runRemotePipeline('react-vite', outputDir, {}, true);
  });

  afterAll(() => removeTempDir(outputDir));

  it('preenche ctx.remote com RemoteState', () => {
    expect(ctx.remote).toBeDefined();
    expect(ctx.remote?.projectName).toBe('react-vite');
    expect(ctx.remote?.readiness).toMatch(/^(ready|ready-with-warnings|blocked)$/);
  });

  it('hostCheck é compatível com perfil padrão', () => {
    expect(ctx.remote?.hostCheck.compatible).toBe(true);
  });

  it('sshCheck é válido com config padrão', () => {
    expect(ctx.remote?.sshCheck.valid).toBe(true);
  });

  it('deploymentCheck tem estratégia definida', () => {
    expect(ctx.remote?.deploymentCheck.strategy).not.toBe('unknown');
  });

  it('transferPlan lista arquivos Docker', () => {
    const files = ctx.remote?.transferPlan.files ?? [];
    expect(files.some((f) => f.localPath.includes('Dockerfile'))).toBe(true);
  });

  it('executionPlan tem 5 passos de execução', () => {
    expect(ctx.remote?.executionPlan.steps).toHaveLength(5);
  });

  it('executionPlan inclui passo remoto e passo local', () => {
    const steps = ctx.remote?.executionPlan.steps ?? [];
    expect(steps.some((s) => s.remote)).toBe(true);
    expect(steps.some((s) => !s.remote)).toBe(true);
  });

  it('remote-execution-plan.json foi gerado em disco', () => {
    const planPath = path.join(outputDir, 'remote', 'remote-execution-plan.json');
    expect(fs.existsSync(planPath)).toBe(true);
  });

  it('remote-dry-run.md foi gerado em disco', () => {
    const dryRunPath = path.join(outputDir, 'remote', 'remote-dry-run.md');
    expect(fs.existsSync(dryRunPath)).toBe(true);
  });

  it('remote-summary.md foi gerado em disco', () => {
    const summaryPath = path.join(outputDir, 'remote', 'remote-summary.md');
    expect(fs.existsSync(summaryPath)).toBe(true);
  });

  it('remote-execution-plan.json corresponde ao snapshot', () => {
    const planPath = path.join(outputDir, 'remote', 'remote-execution-plan.json');
    const content = JSON.parse(fs.readFileSync(planPath, 'utf-8'));
    const normalized = normalizeOutput(content, { outputDir });
    expect(normalized).toMatchSnapshot();
  });

  it('remote-dry-run.md corresponde ao snapshot', () => {
    const dryRunPath = path.join(outputDir, 'remote', 'remote-dry-run.md');
    const content = fs.readFileSync(dryRunPath, 'utf-8');
    const normalized = normalizeOutput(content, { outputDir });
    expect(normalized).toMatchSnapshot();
  });
});

describe('Remote — Pipeline completo (supabase-project)', () => {
  let outputDir: string;
  let ctx: ProjectContext;

  beforeAll(async () => {
    outputDir = makeTempDir();
    ctx = await runRemotePipeline('supabase-project', outputDir, {}, true);
  });

  afterAll(() => removeTempDir(outputDir));

  it('transferPlan inclui artefatos supabase/', () => {
    const files = ctx.remote?.transferPlan.files ?? [];
    expect(files.some((f) => f.localPath.startsWith('supabase/'))).toBe(true);
  });

  it('readiness é definido', () => {
    expect(ctx.remote?.readiness).toMatch(/^(ready|ready-with-warnings|blocked)$/);
  });
});
