/**
 * Testes de integração da fase guide v1.
 *
 * Verifica:
 *  - GuideState preenchido corretamente
 *  - DEPLOY.md gerado em disco com conteúdo contextual
 *  - Conteúdo do DEPLOY.md reflete o framework, package manager e env vars detectados
 *  - Targets diferentes geram conteúdos diferentes (Hostinger vs genérico)
 *  - Normalização de domínio (remove protocolo e trailing slash)
 *  - Fallback de target desconhecido para perfil genérico
 *
 * Não há SSH real nem execução remota — apenas geração de arquivos.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import path from 'path';
import fs from 'fs';
import type { ProjectContext } from '../../src/core/types';
import { guideProject, resolveTargetProfile, listAvailableTargets } from '../../src/guide';
import { runGuidePipeline, runPipeline, makeTempDir, removeTempDir } from '../helpers/pipeline';
import { normalizeOutput } from '../helpers/normalize';

// ─── Target profiles ──────────────────────────────────────────────────────────

describe('Guide — Target profiles', () => {
  it('resolve perfil Hostinger por id', () => {
    const profile = resolveTargetProfile('hostinger');
    expect(profile.id).toBe('hostinger');
    expect(profile.displayName).toBe('Hostinger VPS');
    expect(profile.panelName).toBe('hPanel');
  });

  it('resolve perfil generic por id', () => {
    const profile = resolveTargetProfile('generic');
    expect(profile.id).toBe('generic');
    expect(profile.displayName).toBe('VPS genérico');
  });

  it('targets sem perfil dedicado caem em generic (fallback seguro)', () => {
    const profileDo  = resolveTargetProfile('digitalocean');
    const profileAws = resolveTargetProfile('aws-lightsail');
    expect(profileDo.id).toBe('generic');
    expect(profileAws.id).toBe('generic');
  });

  it('listAvailableTargets retorna todos os targets registrados', () => {
    const targets = listAvailableTargets();
    expect(targets).toContain('hostinger');
    expect(targets).toContain('generic');
    expect(targets).toContain('digitalocean');
    expect(targets).toContain('aws-lightsail');
  });

  it('perfil Hostinger inclui instruções específicas do painel', () => {
    const profile = resolveTargetProfile('hostinger');
    const joined = profile.panelInstructions.join(' ');
    expect(joined).toContain('hpanel');
    expect(joined).toContain('VPS');
  });
});

// ─── Pré-condições do guideProject ───────────────────────────────────────────

describe('Guide — Pré-condições', () => {
  it('lança erro quando ctx.analysis está ausente', () => {
    const ctx = {
      meta: { name: 'x', createdAt: '' },
      source: { kind: 'dir', description: '', inputPath: '' },
      files: [],
    } as unknown as ProjectContext;

    expect(() => guideProject(ctx, '/tmp/x')).toThrowError(/análise prévia/);
  });

  it('lança erro quando ctx.plan está ausente', async () => {
    // Pipeline parcial: análise feita, plano não
    const { runAnalysis } = await import('../helpers/pipeline');
    const ctx = await runAnalysis('react-vite');
    expect(() => guideProject(ctx, '/tmp/x')).toThrowError(/planejamento prévio/);
  });
});

// ─── Pipeline completo: react-vite + Hostinger ───────────────────────────────

describe('Guide — Pipeline completo (react-vite + hostinger + domínio)', () => {
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

  it('preenche ctx.guide com GuideState completo', () => {
    expect(ctx.guide).toBeDefined();
    expect(ctx.guide?.projectName).toBe('react-vite');
    expect(ctx.guide?.target).toBe('hostinger');
    expect(ctx.guide?.domain).toBe('meuapp.com');
    expect(ctx.guide?.difficultyLevel).toBe('beginner');
  });

  it('usa a porta exposta do deploy quando --port não é informado', () => {
    // react-vite gera estratégia static (porta 80 no nginx)
    expect(ctx.guide?.port).toBe(ctx.deploy?.docker.exposedPort);
  });

  it('DEPLOY.md foi gerado em disco', () => {
    const docPath = path.join(outputDir, 'deployment-guide', 'DEPLOY.md');
    expect(fs.existsSync(docPath)).toBe(true);
  });

  it('DEPLOY.md tem o nome do projeto no cabeçalho', () => {
    const content = fs.readFileSync(
      path.join(outputDir, 'deployment-guide', 'DEPLOY.md'),
      'utf-8',
    );
    expect(content).toContain('# Deploy do projeto react-vite');
  });

  it('DEPLOY.md menciona o framework detectado', () => {
    const content = fs.readFileSync(
      path.join(outputDir, 'deployment-guide', 'DEPLOY.md'),
      'utf-8',
    );
    expect(content).toContain('React');
  });

  it('DEPLOY.md inclui passos numerados (9 passos)', () => {
    const content = fs.readFileSync(
      path.join(outputDir, 'deployment-guide', 'DEPLOY.md'),
      'utf-8',
    );
    expect(content).toContain('## Passo 1');
    expect(content).toContain('## Passo 2');
    expect(content).toContain('## Passo 9');
    expect(ctx.guide?.deployDoc.stepCount).toBe(9);
  });

  it('DEPLOY.md inclui texto específico de Hostinger', () => {
    const content = fs.readFileSync(
      path.join(outputDir, 'deployment-guide', 'DEPLOY.md'),
      'utf-8',
    );
    expect(content).toContain('Hostinger VPS');
    expect(content).toContain('hPanel');
  });

  it('DEPLOY.md usa o domínio fornecido nas configurações de Nginx', () => {
    const content = fs.readFileSync(
      path.join(outputDir, 'deployment-guide', 'DEPLOY.md'),
      'utf-8',
    );
    expect(content).toContain('meuapp.com');
    expect(content).toContain('server_name meuapp.com www.meuapp.com');
  });

  it('DEPLOY.md inclui comandos Docker (docker compose up)', () => {
    const content = fs.readFileSync(
      path.join(outputDir, 'deployment-guide', 'DEPLOY.md'),
      'utf-8',
    );
    expect(content).toContain('docker compose up');
  });

  it('DEPLOY.md inclui comandos Certbot (SSL)', () => {
    const content = fs.readFileSync(
      path.join(outputDir, 'deployment-guide', 'DEPLOY.md'),
      'utf-8',
    );
    expect(content).toContain('certbot');
    expect(content).toContain('Let\'s Encrypt');
  });

  it('DEPLOY.md inclui seção de troubleshooting', () => {
    const content = fs.readFileSync(
      path.join(outputDir, 'deployment-guide', 'DEPLOY.md'),
      'utf-8',
    );
    expect(content).toContain('## Solução de problemas');
  });

  it('DEPLOY.md inclui seção "O que esperar" antes do Passo 1', () => {
    const content = fs.readFileSync(
      path.join(outputDir, 'deployment-guide', 'DEPLOY.md'),
      'utf-8',
    );
    const expectIdx = content.indexOf('## O que esperar');
    const step1Idx  = content.indexOf('## Passo 1');
    expect(expectIdx).toBeGreaterThan(-1);
    expect(step1Idx).toBeGreaterThan(-1);
    expect(expectIdx).toBeLessThan(step1Idx);
  });

  it('Troubleshooting aparece ANTES de "Atalhos via script"', () => {
    const content = fs.readFileSync(
      path.join(outputDir, 'deployment-guide', 'DEPLOY.md'),
      'utf-8',
    );
    const troubleIdx = content.indexOf('## Solução de problemas');
    const shortcutsIdx = content.indexOf('## Atalhos via script');
    expect(troubleIdx).toBeGreaterThan(-1);
    expect(shortcutsIdx).toBeGreaterThan(-1);
    expect(troubleIdx).toBeLessThan(shortcutsIdx);
  });

  it('DEPLOY.md corresponde ao snapshot (react-vite + hostinger)', () => {
    const content = fs.readFileSync(
      path.join(outputDir, 'deployment-guide', 'DEPLOY.md'),
      'utf-8',
    );
    const normalized = normalizeOutput(content, { outputDir });
    expect(normalized).toMatchSnapshot();
  });
});

// ─── Pipeline com fixture Supabase ───────────────────────────────────────────

describe('Guide — Pipeline completo (supabase-project)', () => {
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

  it('detecta uso de Supabase e adiciona hint específico no DEPLOY.md', () => {
    const content = fs.readFileSync(
      path.join(outputDir, 'deployment-guide', 'DEPLOY.md'),
      'utf-8',
    );
    expect(content).toContain('Supabase');
    expect(content).toMatch(/SUPABASE_URL/);
    expect(content).toMatch(/SUPABASE_ANON_KEY/);
  });

  it('GuideState reflete o projeto correto', () => {
    expect(ctx.guide?.projectName).toBe('supabase-project');
  });

  it('DEPLOY.md corresponde ao snapshot (supabase + hostinger)', () => {
    const content = fs.readFileSync(
      path.join(outputDir, 'deployment-guide', 'DEPLOY.md'),
      'utf-8',
    );
    const normalized = normalizeOutput(content, { outputDir });
    expect(normalized).toMatchSnapshot();
  });
});

// ─── Target generic produz conteúdo diferente ─────────────────────────────────

describe('Guide — Target generic produz conteúdo neutro', () => {
  let outputDir: string;

  beforeAll(async () => {
    outputDir = makeTempDir();
    await runGuidePipeline(
      'react-vite',
      outputDir,
      { target: 'generic', domain: 'meuapp.com' },
      true,
    );
  });

  afterAll(() => removeTempDir(outputDir));

  it('DEPLOY.md não menciona Hostinger / hPanel quando target é generic', () => {
    const content = fs.readFileSync(
      path.join(outputDir, 'deployment-guide', 'DEPLOY.md'),
      'utf-8',
    );
    expect(content).not.toContain('Hostinger VPS');
    expect(content).not.toContain('hPanel');
    expect(content).toContain('VPS genérico');
  });
});

// ─── Normalização de domínio ──────────────────────────────────────────────────

describe('Guide — Normalização de domínio', () => {
  let outputDir: string;

  beforeAll(() => {
    outputDir = makeTempDir();
  });

  afterAll(() => removeTempDir(outputDir));

  it('remove protocolo https:// do domínio', async () => {
    const ctx = await runGuidePipeline(
      'react-vite',
      outputDir,
      { target: 'hostinger', domain: 'https://meuapp.com' },
      true,
    );
    expect(ctx.guide?.domain).toBe('meuapp.com');
  });

  it('remove trailing slash do domínio', async () => {
    const outDir2 = makeTempDir();
    try {
      const ctx = await runGuidePipeline(
        'react-vite',
        outDir2,
        { target: 'hostinger', domain: 'meuapp.com/' },
        true,
      );
      expect(ctx.guide?.domain).toBe('meuapp.com');
    } finally {
      removeTempDir(outDir2);
    }
  });

  it('retorna null quando domínio não é informado', async () => {
    const outDir3 = makeTempDir();
    try {
      const ctx = await runGuidePipeline('react-vite', outDir3, { target: 'hostinger' }, true);
      expect(ctx.guide?.domain).toBeNull();
    } finally {
      removeTempDir(outDir3);
    }
  });

  it('rejeita domínio começando com www. com mensagem amigável', async () => {
    const outDir = makeTempDir();
    try {
      await expect(
        runGuidePipeline('react-vite', outDir, { target: 'hostinger', domain: 'www.meuapp.com' }, true),
      ).rejects.toThrow(/sem "www\.".*meuapp\.com/i);
    } finally {
      removeTempDir(outDir);
    }
  });

  it('rejeita domínio com formato inválido', async () => {
    const outDir = makeTempDir();
    try {
      await expect(
        runGuidePipeline('react-vite', outDir, { target: 'hostinger', domain: 'naoehumdominio' }, true),
      ).rejects.toThrow(/Domínio inválido/);
    } finally {
      removeTempDir(outDir);
    }
  });

  it('rejeita adminEmail com formato inválido', async () => {
    const outDir = makeTempDir();
    try {
      await expect(
        runGuidePipeline(
          'react-vite',
          outDir,
          { target: 'hostinger', domain: 'meuapp.com', adminEmail: 'naoehumemail' },
          true,
        ),
      ).rejects.toThrow(/Email inválido/);
    } finally {
      removeTempDir(outDir);
    }
  });

  it('aceita adminEmail válido', async () => {
    const outDir = makeTempDir();
    try {
      const ctx = await runGuidePipeline(
        'react-vite',
        outDir,
        { target: 'hostinger', domain: 'meuapp.com', adminEmail: 'admin@meuapp.com' },
        true,
      );
      expect(ctx.guide?.domain).toBe('meuapp.com');
    } finally {
      removeTempDir(outDir);
    }
  });

  it('DEPLOY.md sem domínio inclui callout informando que falta configurar', async () => {
    const outDir4 = makeTempDir();
    try {
      await runGuidePipeline('react-vite', outDir4, { target: 'hostinger' }, true);
      const content = fs.readFileSync(
        path.join(outDir4, 'deployment-guide', 'DEPLOY.md'),
        'utf-8',
      );
      expect(content).toContain('Você ainda não configurou um domínio');
    } finally {
      removeTempDir(outDir4);
    }
  });
});

// ─── Imutabilidade do contexto ────────────────────────────────────────────────

describe('Guide — Imutabilidade do contexto', () => {
  it('guideContext não muta o ctx original', async () => {
    const outputDir = makeTempDir();
    try {
      const before = await runPipeline('react-vite', outputDir, true);
      expect(before.guide).toBeUndefined();

      const after = await runGuidePipeline('react-vite', outputDir, { target: 'hostinger' }, true);
      expect(after.guide).toBeDefined();
      // O segundo retorna um novo objeto — não compartilha referência
      expect(before.guide).toBeUndefined();
    } finally {
      removeTempDir(outputDir);
    }
  });
});
