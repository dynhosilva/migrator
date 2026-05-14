/**
 * Testa que o validator e o analyzer tratam corretamente ZIPs exportados do
 * Lovable.dev, onde todos os arquivos são aninhados sob um diretório raiz
 * (ex: "my-saas-app/package.json" em vez de "package.json").
 *
 * Garante que PACKAGE_JSON_MISSING e NO_ENTRY_POINT não sejam falsos positivos
 * para projetos exportados via ZIP.
 */

import path from 'path';
import os from 'os';
import fs from 'fs';
import AdmZip from 'adm-zip';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { ZipSource } from '../../src/sources/zip';
import { createContext } from '../../src/core';
import { analyzeContext } from '../../src/analyzer';
import { planContext } from '../../src/planner';
import { validateContext } from '../../src/validator';

const PROJECT_ROOT = 'my-saas-app';

function makeZipBuffer(): Buffer {
  const zip = new AdmZip();
  zip.addFile(`${PROJECT_ROOT}/package.json`, Buffer.from(JSON.stringify({
    name: 'my-saas-app',
    version: '1.0.0',
    scripts: { dev: 'vite', build: 'vite build' },
    dependencies: { react: '^18.2.0', 'react-dom': '^18.2.0' },
    devDependencies: { vite: '^5.0.0', '@vitejs/plugin-react': '^4.0.0' },
  })));
  zip.addFile(`${PROJECT_ROOT}/index.html`, Buffer.from('<!DOCTYPE html><html><body><div id="root"></div></body></html>'));
  zip.addFile(`${PROJECT_ROOT}/vite.config.ts`, Buffer.from(`import { defineConfig } from 'vite';\nexport default defineConfig({});\n`));
  zip.addFile(`${PROJECT_ROOT}/src/main.tsx`, Buffer.from(`import React from 'react';\nimport ReactDOM from 'react-dom/client';\nReactDOM.createRoot(document.getElementById('root')!).render(<React.StrictMode><div /></React.StrictMode>);\n`));
  zip.addFile(`${PROJECT_ROOT}/src/App.tsx`, Buffer.from(`export default function App() { return <div>Hello</div>; }\n`));
  return zip.toBuffer();
}

let zipPath: string;

beforeAll(() => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'lovable-zip-test-'));
  zipPath = path.join(tmp, 'my-saas-app.zip');
  fs.writeFileSync(zipPath, makeZipBuffer());
});

afterAll(() => {
  fs.rmSync(path.dirname(zipPath), { recursive: true, force: true });
});

describe('ZIP nested-root — detector', () => {
  it('detecta framework react corretamente', async () => {
    const source = new ZipSource(zipPath);
    const files = await source.load();
    const ctx = createContext(source, zipPath, 'my-saas-app', files);
    const analyzed = analyzeContext(ctx);
    expect(analyzed.analysis!.framework).toBe('react');
  });

  it('paths dos arquivos contêm o prefixo do projeto', async () => {
    const source = new ZipSource(zipPath);
    const files = await source.load();
    expect(files.every((f) => f.relativePath.startsWith(`${PROJECT_ROOT}/`))).toBe(true);
  });
});

describe('ZIP nested-root — validator', () => {
  it('não gera PACKAGE_JSON_MISSING para ZIP com prefixo de pasta', async () => {
    const source = new ZipSource(zipPath);
    const files = await source.load();
    const ctx = createContext(source, zipPath, 'my-saas-app', files);
    const analyzed = analyzeContext(ctx);
    const planned = planContext(analyzed);
    const validated = validateContext(planned);

    const allCodes = validated.validation!.issues.map((i) => i.code);
    expect(allCodes).not.toContain('PACKAGE_JSON_MISSING');
  });

  it('não gera NO_ENTRY_POINT para ZIP com index.html e src/main.tsx aninhados', async () => {
    const source = new ZipSource(zipPath);
    const files = await source.load();
    const ctx = createContext(source, zipPath, 'my-saas-app', files);
    const analyzed = analyzeContext(ctx);
    const planned = planContext(analyzed);
    const validated = validateContext(planned);

    const allCodes = validated.validation!.issues.map((i) => i.code);
    expect(allCodes).not.toContain('NO_ENTRY_POINT');
  });

  it('safeToMigrate é true — sem falsos positivos de filesystem', async () => {
    const source = new ZipSource(zipPath);
    const files = await source.load();
    const ctx = createContext(source, zipPath, 'my-saas-app', files);
    const analyzed = analyzeContext(ctx);
    const planned = planContext(analyzed);
    const validated = validateContext(planned);

    expect(validated.validation!.safeToMigrate).toBe(true);
  });
});
