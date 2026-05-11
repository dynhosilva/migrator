/**
 * Testes de render básico da TUI.
 *
 * Usa ink-testing-library com app.inject() — sem porta de rede real
 * e sem interação de teclado.
 */

import React from 'react';
import { describe, it, expect } from 'vitest';
import { render } from 'ink-testing-library';
import { Header }      from '../../src/tui/components/Header';
import { StatusBadge } from '../../src/tui/components/StatusBadge';
import { LogViewer }   from '../../src/tui/components/LogViewer';

describe('Header', () => {
  it('renderiza título da aplicação', () => {
    const { lastFrame } = render(<Header />);
    expect(lastFrame()).toContain('lovable-migrate');
  });

  it('renderiza subtítulo quando fornecido', () => {
    const { lastFrame } = render(<Header subtitle="Teste de fase" />);
    expect(lastFrame()).toContain('Teste de fase');
  });

  it('renderiza separador horizontal', () => {
    const { lastFrame } = render(<Header />);
    expect(lastFrame()).toContain('─');
  });
});

describe('StatusBadge', () => {
  it('success exibe símbolo de check', () => {
    const { lastFrame } = render(<StatusBadge variant="success" label="Operação OK" />);
    expect(lastFrame()).toContain('✓');
    expect(lastFrame()).toContain('Operação OK');
  });

  it('error exibe símbolo de cross', () => {
    const { lastFrame } = render(<StatusBadge variant="error" label="Falhou" />);
    expect(lastFrame()).toContain('✗');
    expect(lastFrame()).toContain('Falhou');
  });

  it('warning exibe símbolo de aviso', () => {
    const { lastFrame } = render(<StatusBadge variant="warning" label="Atenção" />);
    expect(lastFrame()).toContain('⚠');
  });
});

describe('LogViewer', () => {
  it('renderiza título quando fornecido', () => {
    const { lastFrame } = render(<LogViewer logs={[]} title="Logs da fase" />);
    expect(lastFrame()).toContain('Logs da fase');
  });

  it('exibe mensagem quando vazio', () => {
    const { lastFrame } = render(<LogViewer logs={[]} />);
    expect(lastFrame()).toContain('sem logs');
  });

  it('renderiza linhas de log', () => {
    const logs = ['linha um', 'linha dois', 'linha três'];
    const { lastFrame } = render(<LogViewer logs={logs} />);
    expect(lastFrame()).toContain('linha um');
    expect(lastFrame()).toContain('linha três');
  });

  it('respeita o limite maxRows', () => {
    const logs = Array.from({ length: 20 }, (_, i) => `log-${i}`);
    const { lastFrame } = render(<LogViewer logs={logs} maxRows={5} />);
    expect(lastFrame()).toContain('log-19');
    expect(lastFrame()).not.toContain('log-0');
  });
});
