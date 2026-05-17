/**
 * Testes de integração do CHECKLIST.md gerado pela fase guide.
 *
 * Estratégia:
 *  - Testes unitários das funções `buildXSection()` puras (sem pipeline)
 *  - Testes de pipeline completo (analyze → plan → guide) para validar contexto
 *  - Snapshot do CHECKLIST.md normalizado (proteção contra regressões visuais)
 *
 * Não há SSH, execução remota nem efeitos colaterais — apenas geração de arquivos.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import path from 'path';
import fs from 'fs';
import type { ProjectContext } from '../../src/core/types';
import { resolveTargetProfile } from '../../src/guide';
import {
  generateChecklist,
  __sectionBuilders,
} from '../../src/guide/tasks/checklist-generator';
import type { GuideConfig } from '../../src/guide/types';
import { runGuidePipeline, makeTempDir, removeTempDir } from '../helpers/pipeline';
import { normalizeOutput } from '../helpers/normalize';

// ─── Fixtures locais (para testes unitários sem pipeline) ─────────────────────

function fakeCtx(overrides: Partial<ProjectContext> = {}): ProjectContext {
  const base = {
    meta: { name: 'demo', createdAt: '2026-01-01T00:00:00.000Z' },
    source: { kind: 'dir' as const, description: '', inputPath: '' },
    files: [],
    analysis: {
      projectName: 'demo',
      framework: 'react' as const,
      buildSystem: 'vite' as const,
      packageManager: 'npm' as const,
      language: { primary: 'typescript' as const, hasTypeScriptConfig: true, tsFileCount: 1, jsFileCount: 0 },
      tailwind: { detected: false, hasShadcn: false, hasRadix: false },
      packageJson: null,
      supabase: { detected: false, usesAuth: false, usesStorage: false, usesRealtime: false, clientFiles: [], migrations: { count: 0, files: [] }, edgeFunctions: { count: 0, names: [] } },
      lovable: { detected: false, configFile: null },
      envVars: [],
      routes: [],
      criticalFiles: [],
      detectedAt: '2026-01-01T00:00:00.000Z',
    },
    plan: {
      projectName: 'demo',
      compatibility: { canDeployStatic: true, canDeployServer: true, confidence: 'high' as const, reasons: [] },
      infrastructure: { requiresSupabase: false, requiresDatabase: false, requiresObjectStorage: false, requiresServerlessEdge: false, requiresNodeServer: false, notes: [] },
      env: { required: [], optional: [], missing: [], warnings: [] },
      supabase: { requiresOwnInstance: false, requiresMigrations: false, requiresEdgeFunctions: false, requiresAuth: false, requiresStorage: false, requiresRealtime: false, manualSteps: [], warnings: [] },
      deployStrategy: { recommended: 'static' as const, alternatives: [], confidence: 'high' as const, reasoning: '', notes: [] },
      risks: [],
      checklist: [],
      warnings: [],
      plannedAt: '2026-01-01T00:00:00.000Z',
    },
  };
  return { ...base, ...overrides } as unknown as ProjectContext;
}

function fakeConfig(overrides: Partial<GuideConfig> = {}): GuideConfig {
  return {
    target: 'hostinger',
    profile: resolveTargetProfile('hostinger'),
    domain: 'meuapp.com',
    port: 80,
    remotePath: '/opt/app',
    adminEmail: null,
    ...overrides,
  };
}

// ─── Testes unitários: builders de seção ──────────────────────────────────────

describe('CHECKLIST — buildPreDeploySection', () => {
  it('inclui item de chaves Supabase quando Supabase é detectado', () => {
    const ctx = fakeCtx({
      analysis: {
        ...fakeCtx().analysis!,
        supabase: { ...fakeCtx().analysis!.supabase, detected: true },
      },
    });
    const section = __sectionBuilders.buildPreDeploySection(ctx, fakeConfig());
    const ids = section.items.map((i) => i.id);
    expect(ids).toContain('pre.supabase-keys');
  });

  it('omite item de chaves Supabase quando Supabase não é detectado', () => {
    const section = __sectionBuilders.buildPreDeploySection(fakeCtx(), fakeConfig());
    const ids = section.items.map((i) => i.id);
    expect(ids).not.toContain('pre.supabase-keys');
  });

  it('menciona o domínio fornecido quando há um', () => {
    const section = __sectionBuilders.buildPreDeploySection(fakeCtx(), fakeConfig({ domain: 'meuapp.com' }));
    const domainItem = section.items.find((i) => i.id === 'pre.domain');
    expect(domainItem?.label).toContain('meuapp.com');
  });

  it('marca o item de domínio como opcional', () => {
    const section = __sectionBuilders.buildPreDeploySection(fakeCtx(), fakeConfig());
    const domainItem = section.items.find((i) => i.id === 'pre.domain');
    expect(domainItem?.required).toBe(false);
  });
});

describe('CHECKLIST — buildVpsSetupSection', () => {
  it('usa o nome do painel do target no título', () => {
    const section = __sectionBuilders.buildVpsSetupSection(fakeCtx(), fakeConfig());
    expect(section.title).toContain('Hostinger');
  });

  it('inclui passo de SSH login', () => {
    const section = __sectionBuilders.buildVpsSetupSection(fakeCtx(), fakeConfig());
    const ids = section.items.map((i) => i.id);
    expect(ids).toContain('vps.ssh');
    expect(ids).toContain('vps.login');
  });
});

describe('CHECKLIST — buildEnvSection', () => {
  it('gera um item por variável de ambiente detectada', () => {
    const ctx = fakeCtx({
      analysis: { ...fakeCtx().analysis!, envVars: ['VITE_X', 'VITE_Y'] },
      plan: {
        ...fakeCtx().plan!,
        env: { required: ['VITE_X', 'VITE_Y'], optional: [], missing: [], warnings: [] },
      },
    });
    const section = __sectionBuilders.buildEnvSection(ctx, fakeConfig());
    const labels = section.items.map((i) => i.label).join('\n');
    expect(labels).toContain('VITE_X');
    expect(labels).toContain('VITE_Y');
  });

  it('summary muda quando o projeto usa Supabase', () => {
    const baseCtx = fakeCtx({
      analysis: {
        ...fakeCtx().analysis!,
        supabase: { ...fakeCtx().analysis!.supabase, detected: true },
        envVars: ['VITE_SUPABASE_URL'],
      },
      plan: {
        ...fakeCtx().plan!,
        env: { required: ['VITE_SUPABASE_URL'], optional: [], missing: [], warnings: [] },
      },
    });
    const section = __sectionBuilders.buildEnvSection(baseCtx, fakeConfig());
    expect(section.summary).toContain('Supabase');
  });

  it('summary indica ausência de envs quando não há nenhuma', () => {
    const section = __sectionBuilders.buildEnvSection(fakeCtx(), fakeConfig());
    expect(section.summary).toMatch(/Nenhuma vari/i);
  });
});

describe('CHECKLIST — buildDomainSection', () => {
  it('quando há domínio, gera 3 itens (DNS root, www, propagação)', () => {
    const section = __sectionBuilders.buildDomainSection(fakeCtx(), fakeConfig({ domain: 'meuapp.com' }));
    expect(section.items).toHaveLength(3);
    const ids = section.items.map((i) => i.id);
    expect(ids).toEqual(['domain.dns-a-root', 'domain.dns-a-www', 'domain.propagated']);
  });

  it('quando não há domínio, gera item único de skip opcional', () => {
    const section = __sectionBuilders.buildDomainSection(fakeCtx(), fakeConfig({ domain: null }));
    expect(section.items).toHaveLength(1);
    expect(section.items[0].id).toBe('domain.skip');
    expect(section.items[0].required).toBe(false);
  });
});

describe('CHECKLIST — buildSslSection', () => {
  it('quando há domínio, inclui passos de Nginx + Certbot', () => {
    const section = __sectionBuilders.buildSslSection(fakeCtx(), fakeConfig({ domain: 'meuapp.com' }));
    const ids = section.items.map((i) => i.id);
    expect(ids).toContain('ssl.nginx-install');
    expect(ids).toContain('ssl.certbot-run');
  });

  it('sem domínio, gera apenas item de skip', () => {
    const section = __sectionBuilders.buildSslSection(fakeCtx(), fakeConfig({ domain: null }));
    expect(section.items).toHaveLength(1);
    expect(section.items[0].id).toBe('ssl.skip');
  });
});

describe('CHECKLIST — buildPostDeploySection', () => {
  it('aponta para URL HTTPS quando há domínio', () => {
    const section = __sectionBuilders.buildPostDeploySection(fakeCtx(), fakeConfig({ domain: 'meuapp.com' }));
    const accessItem = section.items.find((i) => i.id === 'post.access');
    expect(accessItem?.label).toContain('https://meuapp.com');
  });

  it('aponta para URL HTTP com IP+porta quando não há domínio', () => {
    const section = __sectionBuilders.buildPostDeploySection(fakeCtx(), fakeConfig({ domain: null, port: 3000 }));
    const accessItem = section.items.find((i) => i.id === 'post.access');
    expect(accessItem?.label).toContain('http://SEU_IP:3000');
  });
});

// ─── Testes do generateChecklist (composição completa) ────────────────────────

describe('CHECKLIST — generateChecklist (estrutura agregada)', () => {
  it('gera exatamente um arquivo em deployment-guide/CHECKLIST.md', () => {
    const artifact = generateChecklist(fakeCtx(), fakeConfig());
    expect(artifact.files).toHaveLength(1);
    expect(artifact.files[0].relativePath).toBe('deployment-guide/CHECKLIST.md');
  });

  it('gera 10 seções na ordem operacional correta', () => {
    const artifact = generateChecklist(fakeCtx(), fakeConfig());
    expect(artifact.sections).toHaveLength(10);
    expect(artifact.sections.map((s) => s.id)).toEqual([
      'pre-deploy',
      'vps-setup',
      'docker-install',
      'upload',
      'env',
      'deploy',
      'domain',
      'ssl',
      'post-deploy',
      'troubleshooting',
    ]);
  });

  it('totalItems = soma dos itens das seções', () => {
    const artifact = generateChecklist(fakeCtx(), fakeConfig());
    const sum = artifact.sections.reduce((acc, s) => acc + s.items.length, 0);
    expect(artifact.totalItems).toBe(sum);
  });

  it('requiredItems não excede totalItems', () => {
    const artifact = generateChecklist(fakeCtx(), fakeConfig());
    expect(artifact.requiredItems).toBeLessThanOrEqual(artifact.totalItems);
    expect(artifact.requiredItems).toBeGreaterThan(0);
  });

  it('Markdown gerado inclui checkboxes `- [ ]`', () => {
    const artifact = generateChecklist(fakeCtx(), fakeConfig());
    const content = artifact.files[0].content;
    const checkboxCount = (content.match(/- \[ \]/g) ?? []).length;
    expect(checkboxCount).toBe(artifact.totalItems);
  });

  it('Markdown gerado inclui tabela de progresso por fase', () => {
    const artifact = generateChecklist(fakeCtx(), fakeConfig());
    expect(artifact.files[0].content).toContain('## Progresso por fase');
    expect(artifact.files[0].content).toContain('| Fase | Itens | Tempo estimado |');
  });
});

// ─── Pipeline completo + snapshots ────────────────────────────────────────────

describe('CHECKLIST — Pipeline completo (react-vite + hostinger + domínio)', () => {
  let outputDir: string;
  let ctx: ProjectContext;

  beforeAll(async () => {
    outputDir = makeTempDir();
    ctx = await runGuidePipeline(
      'react-vite',
      outputDir,
      { target: 'hostinger', domain: 'meuapp.com' },
      true,
    );
  });

  afterAll(() => removeTempDir(outputDir));

  it('preenche ctx.guide.checklist', () => {
    expect(ctx.guide?.checklist).toBeDefined();
    expect(ctx.guide?.checklist.totalItems).toBeGreaterThan(0);
  });

  it('CHECKLIST.md existe em disco', () => {
    const p = path.join(outputDir, 'deployment-guide', 'CHECKLIST.md');
    expect(fs.existsSync(p)).toBe(true);
  });

  it('CHECKLIST.md cita o domínio passado', () => {
    const content = fs.readFileSync(path.join(outputDir, 'deployment-guide', 'CHECKLIST.md'), 'utf-8');
    expect(content).toContain('meuapp.com');
  });

  it('CHECKLIST.md menciona Hostinger no target', () => {
    const content = fs.readFileSync(path.join(outputDir, 'deployment-guide', 'CHECKLIST.md'), 'utf-8');
    expect(content).toContain('Hostinger');
  });

  it('CHECKLIST.md inclui as 10 seções com ícones', () => {
    const content = fs.readFileSync(path.join(outputDir, 'deployment-guide', 'CHECKLIST.md'), 'utf-8');
    expect(content).toContain('## 🧰');
    expect(content).toContain('## 🖥');
    expect(content).toContain('## 🐳');
    expect(content).toContain('## 📦');
    expect(content).toContain('## 🔐');
    expect(content).toContain('## 🚀');
    expect(content).toContain('## 🌐');
    expect(content).toContain('## 🔒');
    expect(content).toContain('## ✅');
    expect(content).toContain('## 🆘');
  });

  it('CHECKLIST.md corresponde ao snapshot (após normalização)', () => {
    const content = fs.readFileSync(path.join(outputDir, 'deployment-guide', 'CHECKLIST.md'), 'utf-8');
    const normalized = normalizeOutput(content, { outputDir });
    expect(normalized).toMatchSnapshot();
  });
});

describe('CHECKLIST — Pipeline completo (supabase-project)', () => {
  let outputDir: string;
  let ctx: ProjectContext;

  beforeAll(async () => {
    outputDir = makeTempDir();
    ctx = await runGuidePipeline(
      'supabase-project',
      outputDir,
      { target: 'hostinger', domain: 'meuapp.com' },
      true,
    );
  });

  afterAll(() => removeTempDir(outputDir));

  it('inclui item de chaves Supabase no pré-deploy', () => {
    const content = fs.readFileSync(path.join(outputDir, 'deployment-guide', 'CHECKLIST.md'), 'utf-8');
    expect(content).toContain('chaves do Supabase');
  });

  it('CHECKLIST.md corresponde ao snapshot (supabase)', () => {
    const content = fs.readFileSync(path.join(outputDir, 'deployment-guide', 'CHECKLIST.md'), 'utf-8');
    const normalized = normalizeOutput(content, { outputDir });
    expect(normalized).toMatchSnapshot();
  });

  it('GuideState reflete o checklist com Supabase incluído', () => {
    const preSection = ctx.guide?.checklist.sections.find((s) => s.id === 'pre-deploy');
    expect(preSection?.items.some((i) => i.id === 'pre.supabase-keys')).toBe(true);
  });
});

describe('CHECKLIST — Pipeline sem domínio', () => {
  let outputDir: string;

  beforeAll(async () => {
    outputDir = makeTempDir();
    await runGuidePipeline('react-vite', outputDir, { target: 'hostinger' }, true);
  });

  afterAll(() => removeTempDir(outputDir));

  it('CHECKLIST.md indica que domínio não foi configurado', () => {
    const content = fs.readFileSync(path.join(outputDir, 'deployment-guide', 'CHECKLIST.md'), 'utf-8');
    expect(content).toContain('(não configurado)');
  });

  it('CHECKLIST.md inclui itens de skip nas seções de domínio e SSL', () => {
    const content = fs.readFileSync(path.join(outputDir, 'deployment-guide', 'CHECKLIST.md'), 'utf-8');
    expect(content).toContain('Pulei essa seção');
  });
});
