/**
 * Testes de integridade do dist/.
 *
 * Verifica que o build produz todos os artefatos esperados
 * e que o package.json tem os campos obrigatórios para distribuição.
 * Esses testes requerem `npm run build` executado previamente.
 */

import { describe, it, expect } from 'vitest';
import fs   from 'fs';
import path from 'path';

const ROOT = path.resolve(__dirname, '../..');
const DIST = path.join(ROOT, 'dist');

function distExists(): boolean {
  return fs.existsSync(DIST);
}

function distFile(...parts: string[]): string {
  return path.join(DIST, ...parts);
}

// ─── package.json ────────────────────────────────────────────────────────────

describe('package.json — campos de distribuição', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const pkg = require('../../package.json') as Record<string, unknown>;

  it('tem campo bin com lovable-migrate', () => {
    const bin = pkg.bin as Record<string, string>;
    expect(bin['lovable-migrate']).toBe('dist/cli.js');
  });

  it('tem campo main apontando para dist/index.js', () => {
    expect(pkg.main).toBe('dist/index.js');
  });

  it('tem campo files incluindo dist/', () => {
    const files = pkg.files as string[];
    expect(files).toContain('dist/');
  });

  it('tem campo engines com node >= 20', () => {
    const engines = pkg.engines as Record<string, string>;
    expect(engines.node).toMatch(/20/);
  });

  it('tem campo license', () => {
    expect(typeof pkg.license).toBe('string');
    expect(pkg.license).not.toBe('');
  });

  it('tem campo description', () => {
    expect(typeof pkg.description).toBe('string');
    expect((pkg.description as string).length).toBeGreaterThan(10);
  });

  it('tem script prepublishOnly', () => {
    const scripts = pkg.scripts as Record<string, string>;
    expect(typeof scripts.prepublishOnly).toBe('string');
  });

  it('version segue semver MAJOR.MINOR.PATCH', () => {
    const version = pkg.version as string;
    expect(version).toMatch(/^\d+\.\d+\.\d+$/);
  });
});

// ─── dist/ — estrutura esperada ───────────────────────────────────────────────

describe('dist/ — artefatos compilados', () => {
  it.skipIf(!distExists())('dist/ existe após build', () => {
    expect(fs.existsSync(DIST)).toBe(true);
  });

  it.skipIf(!distExists())('dist/cli.js existe', () => {
    expect(fs.existsSync(distFile('cli.js'))).toBe(true);
  });

  it.skipIf(!distExists())('dist/cli.js tem shebang', () => {
    const first = fs.readFileSync(distFile('cli.js'), 'utf-8').split('\n')[0];
    expect(first).toBe('#!/usr/bin/env node');
  });

  it.skipIf(!distExists())('dist/index.js existe', () => {
    expect(fs.existsSync(distFile('index.js'))).toBe(true);
  });

  it.skipIf(!distExists())('dist/version.js existe', () => {
    expect(fs.existsSync(distFile('version.js'))).toBe(true);
  });

  const EXPECTED_MODULES = [
    'analyzer', 'planner', 'validator', 'migrator',
    'deploy', 'cicd', 'executor', 'runtime', 'remote',
    'server', 'tui', 'core', 'sources', 'output', 'logger',
    'sync', 'integrations',
  ];

  for (const mod of EXPECTED_MODULES) {
    it.skipIf(!distExists())(`dist/${mod}/ existe`, () => {
      expect(fs.existsSync(distFile(mod))).toBe(true);
    });
  }
});

// ─── Consistência de versão ───────────────────────────────────────────────────

describe('version — consistência entre artefatos', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const pkg = require('../../package.json') as { version: string };

  it('src/version.ts exporta VERSION como string', async () => {
    const { VERSION } = await import('../../src/version');
    expect(typeof VERSION).toBe('string');
    expect(VERSION).toMatch(/^\d+\.\d+\.\d+$/);
  });

  it('VERSION de src/version.ts é igual ao package.json', async () => {
    const { VERSION } = await import('../../src/version');
    expect(VERSION).toBe(pkg.version);
  });
});

// ─── npm pack — conteúdo do tarball ──────────────────────────────────────────

describe('npm pack — conteúdo publicado', () => {
  const { execSync } = require('child_process') as typeof import('child_process');

  function packDryRun(): string {
    return execSync('npm pack --dry-run 2>&1', {
      cwd: ROOT,
      encoding: 'utf-8',
      timeout: 30_000,
    });
  }

  let packOutput: string;
  try {
    packOutput = packDryRun();
  } catch {
    packOutput = '';
  }

  it('npm pack executa sem erros', () => {
    expect(packOutput.length).toBeGreaterThan(0);
    expect(packOutput).not.toContain('npm ERR!');
  });

  it('tarball inclui dist/cli.js', () => {
    expect(packOutput).toContain('dist/cli.js');
  });

  it('tarball inclui dist/index.js', () => {
    expect(packOutput).toContain('dist/index.js');
  });

  it('tarball inclui dist/sync/', () => {
    expect(packOutput).toContain('dist/sync/');
  });

  it('tarball inclui dist/integrations/', () => {
    expect(packOutput).toContain('dist/integrations/');
  });

  it('tarball NÃO inclui src/', () => {
    // src/ must never be published — only dist/ is in files whitelist
    const lines = packOutput.split('\n').filter(l => l.includes('npm notice'));
    const srcLines = lines.filter(l => /\bsrc\//.test(l));
    expect(srcLines).toHaveLength(0);
  });

  it('tarball NÃO inclui test/', () => {
    const lines = packOutput.split('\n').filter(l => l.includes('npm notice'));
    const testLines = lines.filter(l => /\btest\//.test(l));
    expect(testLines).toHaveLength(0);
  });

  it('tarball NÃO inclui tsconfig.json', () => {
    const lines = packOutput.split('\n').filter(l => l.includes('npm notice'));
    const tsLines = lines.filter(l => /tsconfig/.test(l));
    expect(tsLines).toHaveLength(0);
  });

  it('tamanho comprimido é razoável (< 2 MB)', () => {
    // Catches accidental inclusion of large assets or node_modules
    const sizeMatch = packOutput.match(/package size:\s+([\d.]+)\s*(kB|MB)/);
    if (sizeMatch) {
      const value = parseFloat(sizeMatch[1]);
      const unit = sizeMatch[2];
      const sizeKb = unit === 'MB' ? value * 1024 : value;
      expect(sizeKb).toBeLessThan(2048);
    }
  });
});
