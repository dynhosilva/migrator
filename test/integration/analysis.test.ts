/**
 * Snapshot tests do AnalysisReport.
 *
 * Garante que a análise produz resultados determinísticos e que mudanças
 * nos detectores são visíveis como diff de snapshot (não silenciosas).
 *
 * Normalização aplicada antes de cada snapshot:
 * - Timestamps → <TIMESTAMP>
 * - Paths absolutos do fixture → <FIXTURE_DIR>
 */

import { describe, it, expect } from 'vitest';
import { runAnalysis, fixturePath } from '../helpers/pipeline';
import { normalizeOutput } from '../helpers/normalize';

describe('AnalysisReport — react-vite', () => {
  it('detecta framework, build system e package manager', async () => {
    const ctx = await runAnalysis('react-vite');
    expect(ctx.analysis!.framework).toBe('react');
    expect(ctx.analysis!.buildSystem).toBe('vite');
    expect(ctx.analysis!.packageManager).toBe('npm');
  });

  it('detecta variáveis de ambiente do .env', async () => {
    const ctx = await runAnalysis('react-vite');
    const vars = ctx.analysis!.envVars;
    expect(vars).toContain('VITE_API_URL');
    expect(vars).toContain('VITE_APP_TITLE');
    expect(vars).toEqual(expect.arrayContaining(['VITE_API_URL', 'VITE_APP_TITLE']));
  });

  it('não detecta Supabase no react-vite', async () => {
    const ctx = await runAnalysis('react-vite');
    expect(ctx.analysis!.supabase.detected).toBe(false);
    expect(ctx.analysis!.supabase.usesAuth).toBe(false);
  });

  it('report completo corresponde ao snapshot', async () => {
    const ctx = await runAnalysis('react-vite');
    const normalized = normalizeOutput(ctx.analysis!, {
      fixtureDir: fixturePath('react-vite'),
    });
    expect(normalized).toMatchSnapshot();
  });
});

describe('AnalysisReport — supabase-project', () => {
  it('detecta Supabase com auth e storage', async () => {
    const ctx = await runAnalysis('supabase-project');
    expect(ctx.analysis!.supabase.detected).toBe(true);
    expect(ctx.analysis!.supabase.usesAuth).toBe(true);
    expect(ctx.analysis!.supabase.usesStorage).toBe(true);
  });

  it('detecta migration SQL', async () => {
    const ctx = await runAnalysis('supabase-project');
    expect(ctx.analysis!.supabase.migrations.count).toBe(1);
    expect(ctx.analysis!.supabase.migrations.files[0]).toContain('001_create_profiles.sql');
  });

  it('detecta edge function', async () => {
    const ctx = await runAnalysis('supabase-project');
    expect(ctx.analysis!.supabase.edgeFunctions.count).toBe(1);
    expect(ctx.analysis!.supabase.edgeFunctions.names).toEqual(['hello']);
  });

  it('detecta clientFiles com createClient', async () => {
    const ctx = await runAnalysis('supabase-project');
    expect(ctx.analysis!.supabase.clientFiles.length).toBeGreaterThan(0);
    expect(ctx.analysis!.supabase.clientFiles.some((f) => f.includes('supabase.ts'))).toBe(true);
  });

  it('report Supabase corresponde ao snapshot', async () => {
    const ctx = await runAnalysis('supabase-project');
    const normalized = normalizeOutput(ctx.analysis!.supabase, {
      fixtureDir: fixturePath('supabase-project'),
    });
    expect(normalized).toMatchSnapshot();
  });
});

describe('AnalysisReport — minimal-js', () => {
  it('framework é unknown', async () => {
    const ctx = await runAnalysis('minimal-js');
    expect(ctx.analysis!.framework).toBe('unknown');
  });

  it('detecta variável de ambiente em código JS', async () => {
    const ctx = await runAnalysis('minimal-js');
    expect(ctx.analysis!.envVars).toContain('APP_GREETING');
  });

  it('Supabase não detectado', async () => {
    const ctx = await runAnalysis('minimal-js');
    expect(ctx.analysis!.supabase.detected).toBe(false);
  });
});
