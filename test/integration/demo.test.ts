import { describe, it, expect, vi } from 'vitest';
import { DEMO_FILES } from '../../src/demo/fixture';
import { runDemo } from '../../src/demo';
import { createContext } from '../../src/core';
import { analyzeContext } from '../../src/analyzer';
import { planContext } from '../../src/planner';
import { validateContext } from '../../src/validator';
import type { ProjectSource } from '../../src/sources/types';

const demoSource: ProjectSource = {
  kind: 'local',
  load: async () => DEMO_FILES,
  describe: () => 'demo fixture',
};

describe('Demo — fixture de projeto embutido', () => {
  it('fixture contém os arquivos esperados', () => {
    const paths = DEMO_FILES.map((f) => f.relativePath);
    expect(paths).toContain('package.json');
    expect(paths).toContain('.lovable');
    expect(paths).toContain('vite.config.ts');
    expect(paths).toContain('tailwind.config.ts');
    expect(paths.some((p) => p.startsWith('supabase/migrations/'))).toBe(true);
    expect(paths.some((p) => p.startsWith('supabase/functions/'))).toBe(true);
  });

  it('todos os arquivos têm content e size coerentes', () => {
    for (const file of DEMO_FILES) {
      expect(file.content).toBeInstanceOf(Buffer);
      expect(file.size).toBe(file.content.length);
      expect(file.size).toBeGreaterThan(0);
    }
  });

  describe('analyze → plan → validate (pipeline puro)', () => {
    const ctx = createContext(demoSource, 'demo', 'my-saas-app', DEMO_FILES);
    const analyzed = analyzeContext(ctx);
    const planned = planContext(analyzed);
    const validated = validateContext(planned);

    it('detecta framework react', () => {
      expect(analyzed.analysis?.framework).toBe('react');
    });

    it('detecta typescript', () => {
      expect(analyzed.analysis?.language.primary).toBe('typescript');
    });

    it('detecta vite', () => {
      expect(analyzed.analysis?.buildSystem).toBe('vite');
    });

    it('detecta lovable', () => {
      expect(analyzed.analysis?.lovable.detected).toBe(true);
    });

    it('detecta tailwind + shadcn + radix', () => {
      expect(analyzed.analysis?.tailwind.detected).toBe(true);
      expect(analyzed.analysis?.tailwind.hasShadcn).toBe(true);
      expect(analyzed.analysis?.tailwind.hasRadix).toBe(true);
    });

    it('detecta supabase com auth, storage, realtime', () => {
      const supa = analyzed.analysis?.supabase;
      expect(supa?.detected).toBe(true);
      expect(supa?.usesAuth).toBe(true);
      expect(supa?.usesStorage).toBe(true);
      expect(supa?.usesRealtime).toBe(true);
    });

    it('detecta 2 migrations', () => {
      expect(analyzed.analysis?.supabase.migrations.count).toBe(2);
    });

    it('detecta 2 edge functions', () => {
      expect(analyzed.analysis?.supabase.edgeFunctions.count).toBe(2);
    });

    it('detecta 4 variáveis de ambiente', () => {
      expect(analyzed.analysis?.envVars).toHaveLength(4);
    });

    it('detecta 5 rotas', () => {
      expect(analyzed.analysis?.routes).toHaveLength(5);
    });

    it('plano tem deploy strategy', () => {
      expect(planned.plan?.deployStrategy).toBeDefined();
    });

    it('validação executa sem lançar exceção', () => {
      expect(validated.validation).toBeDefined();
      expect(validated.validation?.summary.rulesExecuted).toBeGreaterThan(0);
    });
  });

  it('runDemo() executa sem lançar exceção', () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
    try {
      expect(() => runDemo()).not.toThrow();
    } finally {
      spy.mockRestore();
    }
  });
});
