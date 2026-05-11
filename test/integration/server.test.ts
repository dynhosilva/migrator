/**
 * Testes de integração da API HTTP (src/server/).
 *
 * Usa `app.inject()` do Fastify — sem porta de rede real.
 * Fixtures são somente leitura; output vai para diretórios temporários.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { buildApp }                                  from '../../src/server/app';
import type { FastifyInstance }                      from 'fastify';
import { makeTempDir, removeTempDir, fixturePath }   from '../helpers/pipeline';
import { normalizeOutput, normalizeTimestamps }       from '../helpers/normalize';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function post(app: FastifyInstance, url: string, body: unknown) {
  return app.inject({
    method:  'POST',
    url,
    payload: body,
    headers: { 'content-type': 'application/json' },
  });
}

function get(app: FastifyInstance, url: string) {
  return app.inject({ method: 'GET', url });
}

// ─── GET /health ──────────────────────────────────────────────────────────────

describe('GET /health', () => {
  let app: FastifyInstance;
  beforeAll(async () => { app = await buildApp(); });
  afterAll(async ()  => { await app.close(); });

  it('retorna 200 com shape correta', async () => {
    const res  = await get(app, '/health');
    const body = res.json<Record<string, unknown>>();

    expect(res.statusCode).toBe(200);
    expect(body.success).toBe(true);
    expect(body.status).toBe('ok');
    expect(typeof body.uptime).toBe('number');
    expect(typeof body.timestamp).toBe('string');
  });
});

// ─── GET /version ─────────────────────────────────────────────────────────────

describe('GET /version', () => {
  let app: FastifyInstance;
  beforeAll(async () => { app = await buildApp(); });
  afterAll(async ()  => { await app.close(); });

  it('retorna versão e nome da engine', async () => {
    const res  = await get(app, '/version');
    const body = res.json<Record<string, unknown>>();

    expect(res.statusCode).toBe(200);
    expect(body.success).toBe(true);
    const data = body.data as Record<string, unknown>;
    expect(typeof data.version).toBe('string');
    expect(data.engine).toBe('lovable-migrate');
  });
});

// ─── GET /capabilities ────────────────────────────────────────────────────────

describe('GET /capabilities', () => {
  let app: FastifyInstance;
  beforeAll(async () => { app = await buildApp(); });
  afterAll(async ()  => { await app.close(); });

  it('lista todas as fases', async () => {
    const res  = await get(app, '/capabilities');
    const body = res.json<Record<string, unknown>>();
    const data = body.data as Record<string, unknown>;

    expect(res.statusCode).toBe(200);
    const phases = data.phases as string[];
    expect(phases).toContain('analyze');
    expect(phases).toContain('plan');
    expect(phases).toContain('validate');
    expect(phases).toContain('migrate');
    expect(phases).toContain('deploy');
    expect(phases).toContain('execute');
    expect(phases).toContain('remote');
  });

  it('lista todos os endpoints com method e path', async () => {
    const res  = await get(app, '/capabilities');
    const data = (res.json<Record<string, unknown>>()).data as Record<string, unknown>;
    const endpoints = data.endpoints as Array<{ method: string; path: string }>;

    const paths = endpoints.map((e) => e.path);
    expect(paths).toContain('/health');
    expect(paths).toContain('/capabilities');
    expect(paths).toContain('/version');
    expect(paths).toContain('/analyze');
    expect(paths).toContain('/remote');
  });
});

// ─── 404 handler ──────────────────────────────────────────────────────────────

describe('Rota desconhecida', () => {
  let app: FastifyInstance;
  beforeAll(async () => { app = await buildApp(); });
  afterAll(async ()  => { await app.close(); });

  it('retorna 404 tipado', async () => {
    const res  = await get(app, '/nao-existe');
    const body = res.json<Record<string, unknown>>();

    expect(res.statusCode).toBe(404);
    expect(body.success).toBe(false);
    const error = body.error as Record<string, unknown>;
    expect(error.code).toBe('NOT_FOUND');
    expect(error.phase).toBe('transport');
  });
});

// ─── Schema validation (400) ──────────────────────────────────────────────────

describe('Validação de schema (400)', () => {
  let app: FastifyInstance;
  beforeAll(async () => { app = await buildApp(); });
  afterAll(async ()  => { await app.close(); });

  it('POST /analyze sem body retorna 400', async () => {
    const res  = await post(app, '/analyze', {});
    expect(res.statusCode).toBe(400);
    const body = res.json<Record<string, unknown>>();
    expect(body.success).toBe(false);
    const error = body.error as Record<string, unknown>;
    expect(error.code).toBe('SCHEMA_VALIDATION_ERROR');
    expect(error.phase).toBe('input');
  });

  it('POST /analyze com input vazio retorna 400', async () => {
    const res = await post(app, '/analyze', { input: '' });
    expect(res.statusCode).toBe(400);
  });

  it('POST /migrate com campo extra retorna 400', async () => {
    const res = await post(app, '/migrate', { input: '/x', campoExtra: true });
    expect(res.statusCode).toBe(400);
  });
});

// ─── POST /analyze ────────────────────────────────────────────────────────────

describe('POST /analyze — react-vite', () => {
  let app: FastifyInstance;
  beforeAll(async () => { app = await buildApp(); });
  afterAll(async ()  => { await app.close(); });

  it('input inválido (path inexistente) retorna 4xx com error tipado', async () => {
    const res  = await post(app, '/analyze', { input: '/caminho/nao/existe' });
    const body = res.json<Record<string, unknown>>();

    expect(res.statusCode).toBeGreaterThanOrEqual(400);
    expect(body.success).toBe(false);
    expect(typeof (body.error as Record<string, unknown>).code).toBe('string');
  });

  it('analisa react-vite e retorna framework correto', async () => {
    const res  = await post(app, '/analyze', { input: fixturePath('react-vite') });
    const body = res.json<Record<string, unknown>>();

    expect(res.statusCode).toBe(200);
    expect(body.success).toBe(true);
    const data = body.data as Record<string, unknown>;
    expect(data.framework).toBe('react');
    expect(data.buildSystem).toBe('vite');
    expect(data.packageManager).toBe('npm');
  });

  it('envelope tem requestId, durationMs e phase', async () => {
    const res  = await post(app, '/analyze', { input: fixturePath('react-vite') });
    const body = res.json<Record<string, unknown>>();

    expect(typeof body.requestId).toBe('string');
    expect(typeof body.durationMs).toBe('number');
    expect(body.phase).toBe('analyze');
  });

  it('data normalizada corresponde ao snapshot', async () => {
    const res  = await post(app, '/analyze', { input: fixturePath('react-vite') });
    const data = (res.json<Record<string, unknown>>()).data;
    const normalized = normalizeOutput(data, { fixtureDir: fixturePath('react-vite') });
    expect(normalized).toMatchSnapshot();
  });
});

// ─── POST /plan ───────────────────────────────────────────────────────────────

describe('POST /plan — react-vite', () => {
  let app: FastifyInstance;
  beforeAll(async () => { app = await buildApp(); });
  afterAll(async ()  => { await app.close(); });

  it('retorna deployStrategy e compatibility', async () => {
    const res  = await post(app, '/plan', { input: fixturePath('react-vite') });
    const body = res.json<Record<string, unknown>>();

    expect(res.statusCode).toBe(200);
    const data = body.data as Record<string, unknown>;
    expect(data.deployStrategy).toBeDefined();
    expect(data.compatibility).toBeDefined();
    expect(body.phase).toBe('plan');
  });

  it('data normalizada corresponde ao snapshot', async () => {
    const res  = await post(app, '/plan', { input: fixturePath('react-vite') });
    const data = (res.json<Record<string, unknown>>()).data;
    const normalized = normalizeOutput(data, { fixtureDir: fixturePath('react-vite') });
    expect(normalized).toMatchSnapshot();
  });
});

// ─── POST /validate ───────────────────────────────────────────────────────────

describe('POST /validate', () => {
  let app: FastifyInstance;
  beforeAll(async () => { app = await buildApp(); });
  afterAll(async ()  => { await app.close(); });

  it('react-vite: safeToMigrate false por ENV_VARS_UNRESOLVED', async () => {
    const res  = await post(app, '/validate', { input: fixturePath('react-vite') });
    const data = (res.json<Record<string, unknown>>()).data as Record<string, unknown>;

    expect(res.statusCode).toBe(200);
    expect(data.safeToMigrate).toBe(false);
    const blocking = data.blockingIssues as Array<Record<string, unknown>>;
    const codes = blocking.map((i) => i.code);
    expect(codes).toContain('ENV_VARS_UNRESOLVED');
  });

  it('minimal-js: safeToMigrate false por FRAMEWORK_UNKNOWN', async () => {
    const res  = await post(app, '/validate', { input: fixturePath('minimal-js') });
    const data = (res.json<Record<string, unknown>>()).data as Record<string, unknown>;

    expect(res.statusCode).toBe(200);
    expect(data.safeToMigrate).toBe(false);
    const blocking = data.blockingIssues as Array<Record<string, unknown>>;
    const codes = blocking.map((i) => i.code);
    expect(codes).toContain('FRAMEWORK_UNKNOWN');
  });

  it('summary tem rulesExecuted > 0', async () => {
    const res  = await post(app, '/validate', { input: fixturePath('react-vite') });
    const data = (res.json<Record<string, unknown>>()).data as Record<string, unknown>;
    const summary = data.summary as Record<string, unknown>;
    expect(typeof summary.rulesExecuted).toBe('number');
    expect((summary.rulesExecuted as number)).toBeGreaterThan(0);
  });
});

// ─── POST /migrate ────────────────────────────────────────────────────────────

describe('POST /migrate', () => {
  let app: FastifyInstance;
  let outputDir: string;
  beforeAll(async () => {
    app       = await buildApp();
    outputDir = makeTempDir();
  });
  afterAll(async () => {
    await app.close();
    removeTempDir(outputDir);
  });

  it('minimal-js sem force retorna 409 VALIDATION_BLOCKED', async () => {
    const res  = await post(app, '/migrate', { input: fixturePath('minimal-js') });
    const body = res.json<Record<string, unknown>>();

    expect(res.statusCode).toBe(409);
    expect(body.success).toBe(false);
    expect((body.error as Record<string, unknown>).code).toBe('VALIDATION_BLOCKED');
  });

  it('react-vite com output e force=true retorna 200 com outputDir', async () => {
    const res  = await post(app, '/migrate', {
      input:  fixturePath('react-vite'),
      output: outputDir,
      force:  true,
    });
    const body = res.json<Record<string, unknown>>();

    expect(res.statusCode).toBe(200);
    expect(body.success).toBe(true);
    const data = body.data as Record<string, unknown>;
    expect(data.outputDir).toBeDefined();
    expect(typeof data.filesGenerated).toBe('number');
    expect((data.filesGenerated as number)).toBeGreaterThan(0);
  });

  it('data normalizada corresponde ao snapshot', async () => {
    const res  = await post(app, '/migrate', {
      input:  fixturePath('react-vite'),
      output: outputDir,
      force:  true,
    });
    const data = (res.json<Record<string, unknown>>()).data;
    const normalized = normalizeOutput(data, {
      fixtureDir: fixturePath('react-vite'),
      outputDir,
    });
    expect(normalized).toMatchSnapshot();
  });
});

// ─── POST /deploy ─────────────────────────────────────────────────────────────

describe('POST /deploy — react-vite', () => {
  let app: FastifyInstance;
  let outputDir: string;
  beforeAll(async () => {
    app       = await buildApp();
    outputDir = makeTempDir();
  });
  afterAll(async () => {
    await app.close();
    removeTempDir(outputDir);
  });

  it('retorna strategy e exposedPort', async () => {
    const res  = await post(app, '/deploy', {
      input:  fixturePath('react-vite'),
      output: outputDir,
      force:  true,
    });
    const body = res.json<Record<string, unknown>>();

    expect(res.statusCode).toBe(200);
    const data = body.data as Record<string, unknown>;
    expect(data.strategy).toBeDefined();
    expect(typeof data.exposedPort).toBe('number');
    expect(body.phase).toBe('deploy');
  });

  it('data normalizada corresponde ao snapshot', async () => {
    const res  = await post(app, '/deploy', {
      input:  fixturePath('react-vite'),
      output: outputDir,
      force:  true,
    });
    const data = (res.json<Record<string, unknown>>()).data;
    const normalized = normalizeOutput(data, {
      fixtureDir: fixturePath('react-vite'),
      outputDir,
    });
    expect(normalized).toMatchSnapshot();
  });
});

// ─── POST /execute ────────────────────────────────────────────────────────────

describe('POST /execute — react-vite', () => {
  let app: FastifyInstance;
  let outputDir: string;
  beforeAll(async () => {
    app       = await buildApp();
    outputDir = makeTempDir();
  });
  afterAll(async () => {
    await app.close();
    removeTempDir(outputDir);
  });

  it('retorna readiness e plano de execução', async () => {
    const res  = await post(app, '/execute', {
      input:  fixturePath('react-vite'),
      output: outputDir,
      force:  true,
    });
    const body = res.json<Record<string, unknown>>();

    expect(res.statusCode).toBe(200);
    const data = body.data as Record<string, unknown>;
    expect(['ready', 'ready-with-warnings', 'blocked']).toContain(data.readiness);
    const plan = data.plan as Record<string, unknown>;
    expect(Array.isArray(plan.steps)).toBe(true);
    expect(body.phase).toBe('execute');
  });
});

// ─── POST /remote ─────────────────────────────────────────────────────────────

describe('POST /remote — react-vite', () => {
  let app: FastifyInstance;
  let outputDir: string;
  beforeAll(async () => {
    app       = await buildApp();
    outputDir = makeTempDir();
  });
  afterAll(async () => {
    await app.close();
    removeTempDir(outputDir);
  });

  it('retorna readiness e plano remoto sem SSH real', async () => {
    const res  = await post(app, '/remote', {
      input:  fixturePath('react-vite'),
      output: outputDir,
      force:  true,
    });
    const body = res.json<Record<string, unknown>>();

    expect(res.statusCode).toBe(200);
    const data = body.data as Record<string, unknown>;
    expect(['ready', 'ready-with-warnings', 'blocked']).toContain(data.readiness);
    expect(typeof data.transferFiles).toBe('number');
    expect(Array.isArray(data.executionSteps)).toBe(true);
    expect(body.phase).toBe('remote');
  });

  it('aceita sshConfig parcial sem falhar', async () => {
    const res = await post(app, '/remote', {
      input:     fixturePath('react-vite'),
      output:    outputDir,
      force:     true,
      sshConfig: { host: 'meu-servidor.com', port: 22, user: 'deploy' },
    });
    expect(res.statusCode).toBe(200);
  });

  it('porta SSH fora do range retorna 400', async () => {
    const res = await post(app, '/remote', {
      input:     fixturePath('react-vite'),
      output:    outputDir,
      force:     true,
      sshConfig: { port: 99999 },
    });
    expect(res.statusCode).toBe(400);
  });

  it('data normalizada corresponde ao snapshot', async () => {
    const res  = await post(app, '/remote', {
      input:  fixturePath('react-vite'),
      output: outputDir,
      force:  true,
    });
    const data = (res.json<Record<string, unknown>>()).data;
    const normalized = normalizeOutput(data, {
      fixtureDir: fixturePath('react-vite'),
      outputDir,
    });
    expect(normalized).toMatchSnapshot();
  });
});
