/**
 * Testes do fluxo de confirmação — ConfirmPrompt.
 *
 * Verifica render e resposta a teclas via stdin simulado.
 */

import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render } from 'ink-testing-library';
import { ConfirmPrompt } from '../../../src/tui/components/ConfirmPrompt';

describe('ConfirmPrompt — fluxo de confirmação', () => {
  it('renderiza a mensagem de confirmação', () => {
    const { lastFrame } = render(
      <ConfirmPrompt
        message="Deseja prosseguir com a migração?"
        onConfirm={() => {}}
        onCancel={() => {}}
      />,
    );
    expect(lastFrame()).toContain('Deseja prosseguir com a migração?');
  });

  it('exibe instrução de teclas y/n', () => {
    const { lastFrame } = render(
      <ConfirmPrompt
        message="Confirmar?"
        onConfirm={() => {}}
        onCancel={() => {}}
      />,
    );
    expect(lastFrame()).toContain('y');
    expect(lastFrame()).toContain('n');
  });

  it('chama onConfirm quando y é pressionado', async () => {
    const onConfirm = vi.fn();
    const { stdin } = render(
      <ConfirmPrompt
        message="Confirmar?"
        onConfirm={onConfirm}
        onCancel={() => {}}
      />,
    );
    // Aguarda useEffect registrar o listener do useInput (Ink v3, Node.js)
    await new Promise((r) => setTimeout(r, 20));
    stdin.write('y');
    expect(onConfirm).toHaveBeenCalledOnce();
  });

  it('chama onCancel quando n é pressionado', async () => {
    const onCancel = vi.fn();
    const { stdin } = render(
      <ConfirmPrompt
        message="Confirmar?"
        onConfirm={() => {}}
        onCancel={onCancel}
      />,
    );
    await new Promise((r) => setTimeout(r, 20));
    stdin.write('n');
    expect(onCancel).toHaveBeenCalledOnce();
  });

  it('chama onConfirm com Y maiúsculo', async () => {
    const onConfirm = vi.fn();
    const { stdin } = render(
      <ConfirmPrompt
        message="Confirmar?"
        onConfirm={onConfirm}
        onCancel={() => {}}
      />,
    );
    await new Promise((r) => setTimeout(r, 20));
    stdin.write('Y');
    expect(onConfirm).toHaveBeenCalledOnce();
  });

  it('dangerous=true exibe mensagem sem mudança de layout', () => {
    const { lastFrame } = render(
      <ConfirmPrompt
        message="Operação destrutiva!"
        dangerous
        onConfirm={() => {}}
        onCancel={() => {}}
      />,
    );
    expect(lastFrame()).toContain('Operação destrutiva!');
  });
});
