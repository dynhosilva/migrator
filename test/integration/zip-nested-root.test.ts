/**
 * Testa que analyzer, validator e migrator tratam corretamente ZIPs exportados
 * do Lovable.dev, onde todos os arquivos são aninhados sob um diretório raiz
 * (ex: "my-saas-app/package.json" em vez de "package.json").
 *
 * Cobre toda a cadeia que já causou regressões:
 *   - PACKAGE_JSON_MISSING falso positivo (validator, corrigido em v0.3.1)
 *   - NO_ENTRY_POINT falso positivo (validator, corrigido em v0.3.1)
 *   - Edge functions não exportadas para nested root (migrator, corrigido em v0.3.2)
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
import { migrateContext } from '../../src/migrator';
import { makeTempDir, removeTempDir } from '../helpers/pipeline';

const PROJECT_ROOT = 'my-saas-app';

function makeZipBuffer(): Buffer {
  const zip = new AdmZip();
  zip.addFile(`${PROJECT_ROOT}/package.json`, Buffer.from(JSON.stringify({
    name: 'my-saas-app',
    version: '1.0.0',
    scripts: { dev: 'vite', build: 'vite build' },
    dependencies: {
      react: '^18.2.0',
      'react-dom': '^18.2.0',
      '@supabase/supabase-js': '^2.38.0',
    },
    devDependencies: { vite: '^5.0.0', '@vitejs/plugin-react': '^4.0.0' },
  })));
  zip.addFile(`${PROJECT_ROOT}/index.html`, Buffer.from('<!DOCTYPE html><html><body><div id="root"></div></body></html>'));
  zip.addFile(`${PROJECT_ROOT}/vite.config.ts`, Buffer.from(`import { defineConfig } from 'vite';\nexport default defineConfig({});\n`));
  zip.addFile(`${PROJECT_ROOT}/src/main.tsx`, Buffer.from(`import React from 'react';\nimport ReactDOM from 'react-dom/client';\nReactDOM.createRoot(document.getElementById('root')!).render(<React.StrictMode><div /></React.StrictMode>);\n`));
  zip.addFile(`${PROJECT_ROOT}/src/App.tsx`, Buffer.from(`export default function App() { return <div>Hello</div>; }\n`));
  zip.addFile(`${PROJECT_ROOT}/src/lib/supabase.ts`, Buffer.from(`import { createClient } from '@supabase/supabase-js';\nexport const supabase = createClient('url', 'key');\n`));
  // Supabase migrations
  zip.addFile(`${PROJECT_ROOT}/supabase/migrations/20240101000000_init.sql`, Buffer.from(`CREATE TABLE profiles (id uuid PRIMARY KEY);\n`));
  zip.addFile(`${PROJECT_ROOT}/supabase/migrations/20240115000000_add_teams.sql`, Buffer.from(`CREATE TABLE teams (id uuid PRIMARY KEY);\n`));
  // Edge functions
  zip.addFile(`${PROJECT_ROOT}/supabase/functions/send-email/index.ts`, Buffer.from(`import { serve } from 'https://deno.land/std/http/server.ts';\nserve(() => new Response('ok'));\n`));
  zip.addFile(`${PROJECT_ROOT}/supabase/functions/process-payment/index.ts`, Buffer.from(`import { serve } from 'https://deno.land/std/http/server.ts';\nserve(() => new Response('ok'));\n`));
  return zip.toBuffer();
}

let zipPath: string;
let outputDir: string;

beforeAll(() => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'lovable-zip-test-'));
  zipPath = path.join(tmp, 'my-saas-app.zip');
  fs.writeFileSync(zipPath, makeZipBuffer());
  outputDir = makeTempDir();
});

afterAll(() => {
  fs.rmSync(path.dirname(zipPath), { recursive: true, force: true });
  removeTempDir(outputDir);
});

// ─── helpers ──────────────────────────────────────────────────────────────────

async function loadAndAnalyze() {
  const source = new ZipSource(zipPath);
  const files = await source.load();
  const ctx = createContext(source, zipPath, 'my-saas-app', files);
  return analyzeContext(ctx);
}

// ─── detector ─────────────────────────────────────────────────────────────────

describe('ZIP nested-root — detector', () => {
  it('detecta framework react corretamente', async () => {
    const analyzed = await loadAndAnalyze();
    expect(analyzed.analysis!.framework).toBe('react');
  });

  it('paths dos arquivos contêm o prefixo do projeto', async () => {
    const source = new ZipSource(zipPath);
    const files = await source.load();
    expect(files.every((f) => f.relativePath.startsWith(`${PROJECT_ROOT}/`))).toBe(true);
  });

  it('detecta Supabase com migrations e edge functions', async () => {
    const analyzed = await loadAndAnalyze();
    const { supabase } = analyzed.analysis!;
    expect(supabase.detected).toBe(true);
    expect(supabase.migrations.count).toBe(2);
    expect(supabase.edgeFunctions.count).toBe(2);
    expect(supabase.edgeFunctions.names).toContain('send-email');
    expect(supabase.edgeFunctions.names).toContain('process-payment');
  });
});

// ─── validator ────────────────────────────────────────────────────────────────

describe('ZIP nested-root — validator', () => {
  it('não gera PACKAGE_JSON_MISSING para ZIP com prefixo de pasta', async () => {
    const analyzed = await loadAndAnalyze();
    const planned = planContext(analyzed);
    const validated = validateContext(planned);
    const allCodes = validated.validation!.issues.map((i) => i.code);
    expect(allCodes).not.toContain('PACKAGE_JSON_MISSING');
  });

  it('não gera NO_ENTRY_POINT para ZIP com entry points aninhados', async () => {
    const analyzed = await loadAndAnalyze();
    const planned = planContext(analyzed);
    const validated = validateContext(planned);
    const allCodes = validated.validation!.issues.map((i) => i.code);
    expect(allCodes).not.toContain('NO_ENTRY_POINT');
  });

  it('safeToMigrate é true — sem falsos positivos de filesystem', async () => {
    const analyzed = await loadAndAnalyze();
    const planned = planContext(analyzed);
    const validated = validateContext(planned);
    expect(validated.validation!.safeToMigrate).toBe(true);
  });
});

// ─── migrator — regressão de edge function export ─────────────────────────────

describe('ZIP nested-root — migrator edge functions', () => {
  it('exporta edge functions corretamente mesmo com prefixo de pasta no ZIP', async () => {
    const analyzed = await loadAndAnalyze();
    const planned = planContext(analyzed);
    const validated = validateContext(planned);
    const migrated = migrateContext(validated, outputDir);

    // Edge functions devem ser exportadas, não silenciosamente ignoradas
    expect(migrated.migration!.edgeFunctions.skipped).toBe(false);
    expect(migrated.migration!.edgeFunctions.count).toBe(2);
  });

  it('artefatos de edge function têm paths corretos (sem prefixo do projeto)', async () => {
    const analyzed = await loadAndAnalyze();
    const planned = planContext(analyzed);
    const validated = validateContext(planned);
    const migrated = migrateContext(validated, outputDir);

    const paths = migrated.migration!.edgeFunctions.files.map((f) => f.relativePath);
    expect(paths).toContain('supabase/functions/send-email/index.ts');
    expect(paths).toContain('supabase/functions/process-payment/index.ts');
    // Nenhum path deve conter o prefixo aninhado original
    expect(paths.every((p) => !p.startsWith(PROJECT_ROOT))).toBe(true);
  });

  it('exporta migrations com paths corretos', async () => {
    const analyzed = await loadAndAnalyze();
    const planned = planContext(analyzed);
    const validated = validateContext(planned);
    const migrated = migrateContext(validated, outputDir);

    expect(migrated.migration!.migrations.count).toBe(2);
    const paths = migrated.migration!.migrations.files.map((f) => f.relativePath);
    expect(paths).toContain('supabase/migrations/20240101000000_init.sql');
    expect(paths).toContain('supabase/migrations/20240115000000_add_teams.sql');
  });
});
