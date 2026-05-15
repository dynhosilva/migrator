/**
 * Testes de execução do CLI compilado.
 *
 * Executa o binário em dist/cli.js via child_process para validar
 * que o artefato distribuível funciona corretamente.
 * Requer `npm run build` executado previamente.
 */

import { describe, it, expect } from 'vitest';
import { execSync } from 'child_process';
import fs   from 'fs';
import path from 'path';

const ROOT    = path.resolve(__dirname, '../..');
const CLI_BIN = path.join(ROOT, 'dist', 'cli.js');
const PKG     = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf-8')) as { version: string };

function distExists(): boolean {
  return fs.existsSync(CLI_BIN);
}

function run(args: string): string {
  return execSync(`node "${CLI_BIN}" ${args}`, {
    cwd: ROOT,
    encoding: 'utf-8',
    timeout: 10_000,
  }).trim();
}

function runExpectFail(args: string): string {
  try {
    execSync(`node "${CLI_BIN}" ${args}`, {
      cwd: ROOT,
      encoding: 'utf-8',
      timeout: 10_000,
      stdio: 'pipe',
    });
    return '';
  } catch (e) {
    const err = e as { stdout?: string; stderr?: string; message?: string };
    return (err.stdout ?? '') + (err.stderr ?? '');
  }
}

// ─── Execução básica ─────────────────────────────────────────────────────────

describe('CLI — execução do dist compilado', () => {
  it.skipIf(!distExists())('--version retorna versão do package.json', () => {
    const out = run('--version');
    expect(out).toBe(PKG.version);
  });

  it.skipIf(!distExists())('--help lista comandos disponíveis', () => {
    const out = run('--help');
    expect(out).toContain('analyze');
    expect(out).toContain('plan');
    expect(out).toContain('validate');
    expect(out).toContain('migrate');
    expect(out).toContain('deploy');
    expect(out).toContain('ui');
    expect(out).toContain('server');
  });

  it.skipIf(!distExists())('--help mostra nome da ferramenta', () => {
    const out = run('--help');
    expect(out).toContain('lovable-migrate');
  });

  it.skipIf(!distExists())('analyze --help documenta flags', () => {
    const out = run('analyze --help');
    expect(out).toContain('--verbose');
    expect(out).toContain('--format');
  });

  it.skipIf(!distExists())('comando inválido retorna código de erro', () => {
    const out = runExpectFail('comando-inexistente');
    expect(out.length).toBeGreaterThan(0);
  });
});

// ─── Comando doctor ───────────────────────────────────────────────────────────

describe('CLI — comando doctor', () => {
  it.skipIf(!distExists())('doctor executa e exibe status de Node.js', () => {
    const out = run('doctor');
    expect(out).toContain('Node.js');
  });

  it.skipIf(!distExists())('doctor exibe a versão do lovable-migrate', () => {
    const out = run('doctor');
    expect(out).toContain(PKG.version);
  });

  it.skipIf(!distExists())('doctor exibe status de npm', () => {
    const out = run('doctor');
    expect(out).toContain('npm');
  });
});

// ─── Shebang e permissões ─────────────────────────────────────────────────────

describe('CLI — shebang e entrypoint', () => {
  it.skipIf(!distExists())('dist/cli.js tem shebang na primeira linha', () => {
    const content = fs.readFileSync(CLI_BIN, 'utf-8');
    expect(content.split('\n')[0]).toBe('#!/usr/bin/env node');
  });

  it.skipIf(!distExists())('dist/cli.js pode ser executado diretamente via node', () => {
    const out = run('--version');
    expect(out).not.toBe('');
  });
});
