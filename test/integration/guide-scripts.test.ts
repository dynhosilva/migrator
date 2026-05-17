/**
 * Testes da task script-generator (Fase 1.x do módulo guide).
 *
 * Estratégia:
 *  - Unit tests dos builders puros (sem pipeline) — rápidos
 *  - Composição: generateScripts orquestra todos na ordem certa
 *  - Pipeline completo (analyze → plan → guide) + checagens em disco
 *  - Snapshot normalizado de um script representativo (proteção contra regressões visuais)
 *
 * Garantias verificadas:
 *  - Nenhum script executa nada: apenas geração de arquivos
 *  - Conteúdo bash bem-formado (shebang + `set -euo pipefail`)
 *  - Contextualização: porta, domínio, remotePath, projectName injetados corretamente
 *  - Cross-referência: scriptRef do checklist aponta para arquivos que realmente existem
 *  - DEPLOY.md menciona `chmod +x` e os filenames dos scripts
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import path from 'path';
import fs from 'fs';
import type { ProjectContext } from '../../src/core/types';
import { resolveTargetProfile } from '../../src/guide';
import {
  generateScripts,
  SCRIPT_FILENAMES,
  SCRIPTS_DIR,
  scriptRefFor,
  __scriptBuilders,
} from '../../src/guide/tasks/script-generator';
import type { GuideConfig, BashScriptKey } from '../../src/guide/types';
import { runGuidePipeline, makeTempDir, removeTempDir } from '../helpers/pipeline';
import { normalizeOutput } from '../helpers/normalize';

// ─── Fixtures locais (testes unitários sem pipeline) ──────────────────────────

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
    port: 8080,
    remotePath: '/opt/app',
    adminEmail: 'admin@meuapp.com',
    ...overrides,
  };
}

// ─── Constantes ───────────────────────────────────────────────────────────────

const SHEBANG = '#!/usr/bin/env bash';
const STRICT_MODE = 'set -euo pipefail';

const ALL_KEYS: BashScriptKey[] = [
  'setup-vps',
  'install-docker',
  'upload',
  'deploy',
  'ssl',
  'health-check',
];

// ─── Builders unitários ───────────────────────────────────────────────────────

describe('script-generator — header padrão de todos os scripts', () => {
  it.each(ALL_KEYS)('script "%s" começa com shebang e habilita modo estrito', (key) => {
    const fn = builderFor(key);
    const script = fn(fakeCtx(), fakeConfig());
    expect(script.content.startsWith(SHEBANG)).toBe(true);
    expect(script.content).toContain(STRICT_MODE);
  });

  it.each(ALL_KEYS)('script "%s" expõe metadados consistentes', (key) => {
    const script = builderFor(key)(fakeCtx(), fakeConfig());
    expect(script.key).toBe(key);
    expect(script.filename).toBe(SCRIPT_FILENAMES[key]);
    expect(script.relativePath).toBe(`${SCRIPTS_DIR}/${SCRIPT_FILENAMES[key]}`);
    expect(script.purpose.length).toBeGreaterThan(10);
    expect(script.estimatedMinutes).toBeGreaterThan(0);
    expect(['local', 'remote']).toContain(script.executionLocation);
  });

  it('todos os scripts vêm com cabeçalho versionado por lovable-migrate', () => {
    for (const key of ALL_KEYS) {
      const script = builderFor(key)(fakeCtx(), fakeConfig());
      expect(script.content).toMatch(/Gerado por lovable-migrate v\d+\.\d+\.\d+/);
    }
  });
});

describe('script-generator — buildSetupVpsScript', () => {
  it('inclui apt-get update + upgrade', () => {
    const script = __scriptBuilders.buildSetupVpsScript(fakeCtx(), fakeConfig());
    expect(script.content).toContain('apt-get update');
    expect(script.content).toContain('apt-get upgrade');
  });

  it('configura UFW liberando 22, 80 e 443', () => {
    const script = __scriptBuilders.buildSetupVpsScript(fakeCtx(), fakeConfig());
    expect(script.content).toContain('ufw allow OpenSSH');
    expect(script.content).toContain('ufw allow 80/tcp');
    expect(script.content).toContain('ufw allow 443/tcp');
    expect(script.content).toContain('ufw --force enable');
  });

  it('define timezone UTC explicitamente', () => {
    const script = __scriptBuilders.buildSetupVpsScript(fakeCtx(), fakeConfig());
    expect(script.content).toContain('timedatectl set-timezone UTC');
  });

  it('exige privilégios de root (early-exit)', () => {
    const script = __scriptBuilders.buildSetupVpsScript(fakeCtx(), fakeConfig());
    expect(script.content).toContain('${EUID} -ne 0');
  });

  it('é classificado como execução remota', () => {
    const script = __scriptBuilders.buildSetupVpsScript(fakeCtx(), fakeConfig());
    expect(script.executionLocation).toBe('remote');
    expect(script.requiresArguments).toBe(false);
  });
});

describe('script-generator — buildInstallDockerScript', () => {
  it('usa o instalador oficial get.docker.com', () => {
    const script = __scriptBuilders.buildInstallDockerScript(fakeCtx(), fakeConfig());
    expect(script.content).toContain('https://get.docker.com');
  });

  it('instala o plugin docker-compose-plugin', () => {
    const script = __scriptBuilders.buildInstallDockerScript(fakeCtx(), fakeConfig());
    expect(script.content).toContain('docker-compose-plugin');
  });

  it('habilita Docker no boot via systemctl', () => {
    const script = __scriptBuilders.buildInstallDockerScript(fakeCtx(), fakeConfig());
    expect(script.content).toContain('systemctl enable docker');
  });

  it('valida instalação chamando docker --version e docker compose version', () => {
    const script = __scriptBuilders.buildInstallDockerScript(fakeCtx(), fakeConfig());
    expect(script.content).toContain('docker --version');
    expect(script.content).toContain('docker compose version');
  });
});

describe('script-generator — buildUploadScript', () => {
  it('é o único script com execução LOCAL', () => {
    const script = __scriptBuilders.buildUploadScript(fakeCtx(), fakeConfig());
    expect(script.executionLocation).toBe('local');
    expect(script.requiresArguments).toBe(true);
  });

  it('exige IP do servidor como argumento posicional', () => {
    const script = __scriptBuilders.buildUploadScript(fakeCtx(), fakeConfig());
    expect(script.content).toContain('if [[ $# -lt 1 ]]; then');
    expect(script.content).toContain('SERVER_IP="$1"');
  });

  it('usa tar | ssh tar streaming (não cria arquivos temporários)', () => {
    const script = __scriptBuilders.buildUploadScript(fakeCtx(), fakeConfig());
    expect(script.content).toContain('tar -czf - -C');
    expect(script.content).toContain('tar -xzf - -C');
  });

  it('inclui .env condicionalmente (não falha se não existir)', () => {
    const script = __scriptBuilders.buildUploadScript(fakeCtx(), fakeConfig());
    expect(script.content).toContain('TAR_ARGS=("docker")');
    expect(script.content).toContain('-f "${LOCAL_ARTIFACTS_DIR}/.env"');
  });

  it('usa o defaultUser do target (hostinger → root)', () => {
    const script = __scriptBuilders.buildUploadScript(fakeCtx(), fakeConfig());
    expect(script.content).toContain('REMOTE_USER="root"');
  });

  it('usa o remotePath do config', () => {
    const script = __scriptBuilders.buildUploadScript(fakeCtx(), fakeConfig({ remotePath: '/srv/app' }));
    expect(script.content).toContain('REMOTE_PATH="/srv/app"');
  });
});

describe('script-generator — buildDeployScript', () => {
  it('roda docker compose up -d --build a partir do remotePath/docker', () => {
    const script = __scriptBuilders.buildDeployScript(fakeCtx(), fakeConfig());
    expect(script.content).toContain('docker compose up -d --build');
    expect(script.content).toContain('cd "${REMOTE_PATH}/docker"');
  });

  it('verifica existência de docker/ antes de tentar subir', () => {
    const script = __scriptBuilders.buildDeployScript(fakeCtx(), fakeConfig());
    expect(script.content).toContain('${REMOTE_PATH}/docker');
    expect(script.content).toContain('Rode 03-upload-app.sh');
  });

  it('avisa se .env está ausente (mas não bloqueia)', () => {
    const script = __scriptBuilders.buildDeployScript(fakeCtx(), fakeConfig());
    expect(script.content).toContain('${REMOTE_PATH}/.env');
    expect(script.content).toContain('Ctrl+C');
  });

  it('injeta a porta exposta do contexto', () => {
    const script = __scriptBuilders.buildDeployScript(fakeCtx(), fakeConfig({ port: 4000 }));
    expect(script.content).toContain('APP_PORT="4000"');
  });
});

describe('script-generator — buildSslScript', () => {
  it('aceita DOMAIN e ADMIN_EMAIL como argumentos opcionais (com defaults do config)', () => {
    const script = __scriptBuilders.buildSslScript(fakeCtx(), fakeConfig({
      domain: 'foo.com',
      adminEmail: 'admin@foo.com',
    }));
    expect(script.content).toContain('DOMAIN="${1:-foo.com}"');
    expect(script.content).toContain('ADMIN_EMAIL="${2:-admin@foo.com}"');
  });

  it('quando não há domínio no config, exige argumento (early-exit)', () => {
    const script = __scriptBuilders.buildSslScript(fakeCtx(), fakeConfig({ domain: null }));
    expect(script.content).toContain('__NAO_CONFIGURADO__');
    expect(script.requiresArguments).toBe(true);
  });

  it('cria virtual host Nginx com proxy_pass para a porta da app', () => {
    const script = __scriptBuilders.buildSslScript(fakeCtx(), fakeConfig({ port: 9000 }));
    expect(script.content).toContain('proxy_pass http://localhost:${APP_PORT}');
    expect(script.content).toContain('APP_PORT="9000"');
  });

  it('inclui server_name root + www', () => {
    const script = __scriptBuilders.buildSslScript(fakeCtx(), fakeConfig());
    expect(script.content).toContain('server_name ${DOMAIN} www.${DOMAIN}');
  });

  it('chama Certbot com --nginx + --redirect + --agree-tos', () => {
    const script = __scriptBuilders.buildSslScript(fakeCtx(), fakeConfig());
    expect(script.content).toContain('certbot --nginx');
    expect(script.content).toContain('--redirect');
    expect(script.content).toContain('--agree-tos');
  });

  it('roda dry-run de renovação automática', () => {
    const script = __scriptBuilders.buildSslScript(fakeCtx(), fakeConfig());
    expect(script.content).toContain('certbot renew --dry-run');
  });

  it('escapa variáveis do Nginx ($http_upgrade etc) para não serem interpoladas pelo bash', () => {
    const script = __scriptBuilders.buildSslScript(fakeCtx(), fakeConfig());
    // \$http_upgrade (com backslash) é como escrevemos para o here-doc gerar $http_upgrade literal no arquivo nginx
    expect(script.content).toContain('\\$http_upgrade');
    expect(script.content).toContain('\\$host');
  });
});

describe('script-generator — buildHealthCheckScript', () => {
  it('checa Docker, containers, porta da app, Nginx, DNS e HTTPS', () => {
    const script = __scriptBuilders.buildHealthCheckScript(fakeCtx(), fakeConfig());
    expect(script.content).toContain('systemctl is-active --quiet docker');
    expect(script.content).toContain('docker ps');
    expect(script.content).toContain('http://localhost:${APP_PORT}');
    expect(script.content).toContain('ss -tlnp');
    expect(script.content).toContain('command -v nginx');
    expect(script.content).toContain('https://${DOMAIN}');
  });

  it('retorna exit 0 se tudo passar, 1 se algo falhar', () => {
    const script = __scriptBuilders.buildHealthCheckScript(fakeCtx(), fakeConfig());
    expect(script.content).toContain('FAILED=0');
    expect(script.content).toContain('exit 1');
    expect(script.content).toContain('exit 0');
  });

  it('pula checagens HTTPS quando não há domínio', () => {
    const script = __scriptBuilders.buildHealthCheckScript(fakeCtx(), fakeConfig({ domain: null }));
    expect(script.content).toContain('DOMAIN="__NAO_CONFIGURADO__"');
    expect(script.content).toContain('!= "__NAO_CONFIGURADO__"');
  });
});

// ─── Composição via generateScripts ───────────────────────────────────────────

describe('script-generator — generateScripts (composição)', () => {
  it('gera 6 scripts na ordem correta', () => {
    const artifact = generateScripts(fakeCtx(), fakeConfig());
    expect(artifact.totalScripts).toBe(6);
    expect(artifact.scripts.map((s) => s.key)).toEqual(ALL_KEYS);
  });

  it('files[].relativePath corresponde a deployment-guide/scripts/XX-name.sh', () => {
    const artifact = generateScripts(fakeCtx(), fakeConfig());
    for (const f of artifact.files) {
      expect(f.relativePath.startsWith(`${SCRIPTS_DIR}/`)).toBe(true);
      expect(f.relativePath.endsWith('.sh')).toBe(true);
    }
  });

  it('scriptsByKey contém todos os scripts indexados pela chave', () => {
    const artifact = generateScripts(fakeCtx(), fakeConfig());
    for (const key of ALL_KEYS) {
      expect(artifact.scriptsByKey[key]).toBeDefined();
      expect(artifact.scriptsByKey[key].key).toBe(key);
    }
  });

  it('chmodCommand referencia o scriptsDir', () => {
    const artifact = generateScripts(fakeCtx(), fakeConfig());
    expect(artifact.chmodCommand).toBe(`chmod +x ${SCRIPTS_DIR}/*.sh`);
  });

  it('estimatedMinutes = soma dos estimatedMinutes de cada script', () => {
    const artifact = generateScripts(fakeCtx(), fakeConfig());
    const expected = artifact.scripts.reduce((sum, s) => sum + s.estimatedMinutes, 0);
    expect(artifact.estimatedMinutes).toBe(expected);
  });

  it('exatamente UM script é executado localmente (upload)', () => {
    const artifact = generateScripts(fakeCtx(), fakeConfig());
    const local = artifact.scripts.filter((s) => s.executionLocation === 'local');
    expect(local).toHaveLength(1);
    expect(local[0].key).toBe('upload');
  });
});

// ─── scriptRefFor — utilitário cross-módulo ───────────────────────────────────

describe('script-generator — scriptRefFor', () => {
  it.each(ALL_KEYS)('scriptRefFor(%s) retorna scripts/XX-name.sh (relativo a CHECKLIST.md)', (key) => {
    expect(scriptRefFor(key)).toBe(`scripts/${SCRIPT_FILENAMES[key]}`);
  });
});

// ─── Pipeline completo ───────────────────────────────────────────────────────

describe('script-generator — Pipeline completo (react-vite + hostinger + domínio)', () => {
  let outputDir: string;
  let ctx: ProjectContext;

  beforeAll(async () => {
    outputDir = makeTempDir();
    ctx = await runGuidePipeline(
      'react-vite',
      outputDir,
      { target: 'hostinger', domain: 'meuapp.com', adminEmail: 'admin@meuapp.com' },
      true,
    );
  });

  afterAll(() => removeTempDir(outputDir));

  it('preenche ctx.guide.scripts', () => {
    expect(ctx.guide?.scripts).toBeDefined();
    expect(ctx.guide?.scripts.totalScripts).toBe(6);
  });

  it('todos os 6 scripts foram gerados em disco', () => {
    for (const key of ALL_KEYS) {
      const p = path.join(outputDir, SCRIPTS_DIR, SCRIPT_FILENAMES[key]);
      expect(fs.existsSync(p)).toBe(true);
    }
  });

  it('cada script tem shebang válido e set -euo pipefail', () => {
    for (const key of ALL_KEYS) {
      const content = fs.readFileSync(
        path.join(outputDir, SCRIPTS_DIR, SCRIPT_FILENAMES[key]),
        'utf-8',
      );
      expect(content.startsWith(SHEBANG)).toBe(true);
      expect(content).toContain(STRICT_MODE);
    }
  });

  it('CHECKLIST.md preenche scriptRef em itens cobertos por scripts', () => {
    const content = fs.readFileSync(
      path.join(outputDir, 'deployment-guide', 'CHECKLIST.md'),
      'utf-8',
    );
    // O renderer mostra scriptRef como 📜 `scripts/02-install-docker.sh`
    expect(content).toContain('📜');
    expect(content).toContain(`scripts/${SCRIPT_FILENAMES['install-docker']}`);
    expect(content).toContain(`scripts/${SCRIPT_FILENAMES['upload']}`);
    expect(content).toContain(`scripts/${SCRIPT_FILENAMES['deploy']}`);
    expect(content).toContain(`scripts/${SCRIPT_FILENAMES['ssl']}`);
  });

  it('DEPLOY.md menciona a nova seção "Atalhos via script" e chmod +x', () => {
    const content = fs.readFileSync(
      path.join(outputDir, 'deployment-guide', 'DEPLOY.md'),
      'utf-8',
    );
    expect(content).toContain('Atalhos via script');
    expect(content).toContain(`chmod +x ${SCRIPTS_DIR}/*.sh`);
  });

  it('DEPLOY.md lista todos os 6 scripts na tabela de execução', () => {
    const content = fs.readFileSync(
      path.join(outputDir, 'deployment-guide', 'DEPLOY.md'),
      'utf-8',
    );
    for (const key of ALL_KEYS) {
      expect(content).toContain(SCRIPT_FILENAMES[key]);
    }
  });

  it('script de SSL inclui o domínio e email passados ao gerar', () => {
    const content = fs.readFileSync(
      path.join(outputDir, SCRIPTS_DIR, SCRIPT_FILENAMES['ssl']),
      'utf-8',
    );
    expect(content).toContain('${1:-meuapp.com}');
    expect(content).toContain('${2:-admin@meuapp.com}');
  });

  it('script de deploy usa a porta exposta detectada pelo deploy phase', () => {
    const content = fs.readFileSync(
      path.join(outputDir, SCRIPTS_DIR, SCRIPT_FILENAMES['deploy']),
      'utf-8',
    );
    const expectedPort = ctx.guide!.port;
    expect(content).toContain(`APP_PORT="${expectedPort}"`);
  });

  it('snapshot do install-docker.sh (normalizado) é estável', () => {
    const content = fs.readFileSync(
      path.join(outputDir, SCRIPTS_DIR, SCRIPT_FILENAMES['install-docker']),
      'utf-8',
    );
    const normalized = normalizeOutput(content, { outputDir });
    expect(normalized).toMatchSnapshot();
  });

  it('snapshot do upload.sh (normalizado) é estável', () => {
    const content = fs.readFileSync(
      path.join(outputDir, SCRIPTS_DIR, SCRIPT_FILENAMES['upload']),
      'utf-8',
    );
    const normalized = normalizeOutput(content, { outputDir });
    expect(normalized).toMatchSnapshot();
  });

  it('snapshot do ssl.sh (normalizado) é estável', () => {
    const content = fs.readFileSync(
      path.join(outputDir, SCRIPTS_DIR, SCRIPT_FILENAMES['ssl']),
      'utf-8',
    );
    const normalized = normalizeOutput(content, { outputDir });
    expect(normalized).toMatchSnapshot();
  });
});

// ─── Pipeline sem domínio: scripts ainda gerados, mas requiresArguments=true ─

describe('script-generator — Pipeline sem domínio', () => {
  let outputDir: string;
  let ctx: ProjectContext;

  beforeAll(async () => {
    outputDir = makeTempDir();
    ctx = await runGuidePipeline('react-vite', outputDir, { target: 'hostinger' }, true);
  });

  afterAll(() => removeTempDir(outputDir));

  it('os 6 scripts são gerados mesmo sem domínio', () => {
    expect(ctx.guide?.scripts.totalScripts).toBe(6);
  });

  it('SSL script marca requiresArguments=true quando não há domain no config', () => {
    const ssl = ctx.guide!.scripts.scriptsByKey['ssl'];
    expect(ssl.requiresArguments).toBe(true);
  });

  it('SSL script aborta com erro útil se executado sem argumentos', () => {
    const content = fs.readFileSync(
      path.join(outputDir, SCRIPTS_DIR, SCRIPT_FILENAMES['ssl']),
      'utf-8',
    );
    expect(content).toContain('Nenhum domínio foi fornecido');
    expect(content).toContain('__NAO_CONFIGURADO__');
  });

  it('health-check pula checagens HTTPS quando domain não configurado', () => {
    const content = fs.readFileSync(
      path.join(outputDir, SCRIPTS_DIR, SCRIPT_FILENAMES['health-check']),
      'utf-8',
    );
    expect(content).toContain('Domínio não configurado — pulando checagens HTTPS');
  });
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

function builderFor(key: BashScriptKey) {
  switch (key) {
    case 'setup-vps':      return __scriptBuilders.buildSetupVpsScript;
    case 'install-docker': return __scriptBuilders.buildInstallDockerScript;
    case 'upload':         return __scriptBuilders.buildUploadScript;
    case 'deploy':         return __scriptBuilders.buildDeployScript;
    case 'ssl':            return __scriptBuilders.buildSslScript;
    case 'health-check':   return __scriptBuilders.buildHealthCheckScript;
  }
}
