/**
 * Testes do Validator.
 *
 * Verifica o comportamento de bloqueio e classificação de issues.
 * Usa assertions comportamentais (não snapshots) para maior legibilidade.
 */

import { describe, it, expect } from 'vitest';
import { runValidation } from '../helpers/pipeline';

describe('Validator — broken-project (sem package.json)', () => {
  it('bloqueia migração', async () => {
    const ctx = await runValidation('broken-project');
    expect(ctx.validation!.safeToMigrate).toBe(false);
  });

  it('gera issue crítico PACKAGE_JSON_MISSING', async () => {
    const ctx = await runValidation('broken-project');
    const codes = ctx.validation!.blockingIssues.map((i) => i.code);
    expect(codes).toContain('PACKAGE_JSON_MISSING');
  });

  it('gera issue crítico FRAMEWORK_UNKNOWN', async () => {
    const ctx = await runValidation('broken-project');
    const codes = ctx.validation!.blockingIssues.map((i) => i.code);
    expect(codes).toContain('FRAMEWORK_UNKNOWN');
  });

  it('tem múltiplos issues críticos', async () => {
    const ctx = await runValidation('broken-project');
    expect(ctx.validation!.summary.criticalCount).toBeGreaterThanOrEqual(2);
  });
});

describe('Validator — minimal-js (framework unknown)', () => {
  it('bloqueia migração por framework desconhecido', async () => {
    const ctx = await runValidation('minimal-js');
    expect(ctx.validation!.safeToMigrate).toBe(false);
  });

  it('gera FRAMEWORK_UNKNOWN como critical', async () => {
    const ctx = await runValidation('minimal-js');
    const issue = ctx.validation!.blockingIssues.find((i) => i.code === 'FRAMEWORK_UNKNOWN');
    expect(issue).toBeDefined();
    expect(issue!.severity).toBe('critical');
  });
});

describe('Validator — react-vite (env vars não configuradas)', () => {
  it('bloqueia por ENV_VARS_UNRESOLVED', async () => {
    const ctx = await runValidation('react-vite');
    expect(ctx.validation!.safeToMigrate).toBe(false);
    const codes = ctx.validation!.blockingIssues.map((i) => i.code);
    expect(codes).toContain('ENV_VARS_UNRESOLVED');
  });

  it('issue ENV_VARS_UNRESOLVED menciona as vars detectadas', async () => {
    const ctx = await runValidation('react-vite');
    const issue = ctx.validation!.blockingIssues.find((i) => i.code === 'ENV_VARS_UNRESOLVED');
    expect(issue!.message).toContain('VITE_API_URL');
    expect(issue!.message).toContain('VITE_APP_TITLE');
  });

  it('validate retorna summary com contagens corretas', async () => {
    const ctx = await runValidation('react-vite');
    expect(ctx.validation!.summary.rulesExecuted).toBe(7);
    expect(ctx.validation!.summary.criticalCount).toBeGreaterThanOrEqual(1);
  });
});

describe('Validator — supabase-project (Supabase sem vars)', () => {
  it('bloqueia por env vars ausentes', async () => {
    const ctx = await runValidation('supabase-project');
    expect(ctx.validation!.safeToMigrate).toBe(false);
  });

  it('gera aviso de edge functions manuais', async () => {
    const ctx = await runValidation('supabase-project');
    const warnCodes = ctx.validation!.warnings.map((i) => i.code);
    expect(warnCodes).toContain('EDGE_FUNCTIONS_MANUAL_DEPLOY');
  });

  it('gera aviso de migrations requerem staging', async () => {
    const ctx = await runValidation('supabase-project');
    const warnCodes = ctx.validation!.warnings.map((i) => i.code);
    // MIGRATIONS_ORDER_UNVERIFIED só aparece com count > 1; count=1 gera MIGRATIONS_REQUIRE_STAGING
    expect(warnCodes).toContain('MIGRATIONS_REQUIRE_STAGING');
  });
});
