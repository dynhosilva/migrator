/**
 * Testes de renderização do StepProgress — exibição de progresso por fase.
 */

import React from 'react';
import { describe, it, expect } from 'vitest';
import { render } from 'ink-testing-library';
import { StepProgress } from '../../../src/tui/components/StepProgress';
import type { Step } from '../../../src/tui/components/StepProgress';

const STEPS: Step[] = [
  { key: 'analyze',  label: 'Analisar stack',        status: 'done'    },
  { key: 'plan',     label: 'Gerar plano',            status: 'running' },
  { key: 'validate', label: 'Validar segurança',      status: 'idle'    },
  { key: 'migrate',  label: 'Gerar artefatos',        status: 'idle'    },
];

describe('StepProgress — renderização de progresso', () => {
  it('renderiza todos os steps pelo label', () => {
    const { lastFrame } = render(<StepProgress steps={STEPS} />);
    expect(lastFrame()).toContain('Analisar stack');
    expect(lastFrame()).toContain('Gerar plano');
    expect(lastFrame()).toContain('Validar segurança');
    expect(lastFrame()).toContain('Gerar artefatos');
  });

  it('step done exibe símbolo de check', () => {
    const steps: Step[] = [{ key: 'x', label: 'Fase concluída', status: 'done' }];
    const { lastFrame } = render(<StepProgress steps={steps} />);
    expect(lastFrame()).toContain('✓');
  });

  it('step failed exibe símbolo de cross', () => {
    const steps: Step[] = [{ key: 'x', label: 'Fase falhou', status: 'failed' }];
    const { lastFrame } = render(<StepProgress steps={steps} />);
    expect(lastFrame()).toContain('✗');
  });

  it('step running exibe símbolo de ponto preenchido', () => {
    const steps: Step[] = [{ key: 'x', label: 'Executando', status: 'running' }];
    const { lastFrame } = render(<StepProgress steps={steps} />);
    expect(lastFrame()).toContain('●');
  });

  it('step idle exibe símbolo de ponto vazio', () => {
    const steps: Step[] = [{ key: 'x', label: 'Aguardando', status: 'idle' }];
    const { lastFrame } = render(<StepProgress steps={steps} />);
    expect(lastFrame()).toContain('○');
  });

  it('numeração começa em 1', () => {
    const steps: Step[] = [{ key: 'x', label: 'Primeiro', status: 'idle' }];
    const { lastFrame } = render(<StepProgress steps={steps} />);
    expect(lastFrame()).toContain('1.');
  });

  it('lista vazia não gera erro', () => {
    const { lastFrame } = render(<StepProgress steps={[]} />);
    expect(lastFrame()).toBeDefined();
  });
});
