/**
 * Testes de estado de navegação da TUI.
 *
 * Testa o reducer e os hooks de estado isoladamente —
 * sem montar componentes Ink.
 */

import { describe, it, expect } from 'vitest';
import { tuiReducer, INITIAL_SESSION } from '../../src/tui/state/reducer';
import type { TuiAction } from '../../src/tui/state/types';

function dispatch(action: TuiAction) {
  return tuiReducer(INITIAL_SESSION, action);
}

describe('tuiReducer — navegação de screens', () => {
  it('inicia na tela welcome', () => {
    expect(INITIAL_SESSION.screen).toBe('welcome');
  });

  it('SET_SCREEN altera a tela', () => {
    const state = dispatch({ type: 'SET_SCREEN', screen: 'project-select' });
    expect(state.screen).toBe('project-select');
  });

  it('SET_ERROR redireciona para error screen', () => {
    const state = dispatch({ type: 'SET_ERROR', error: 'Falha ao carregar' });
    expect(state.screen).toBe('error');
    expect(state.error).toBe('Falha ao carregar');
  });

  it('SET_INPUT atualiza inputPath', () => {
    const state = dispatch({ type: 'SET_INPUT', inputPath: '/meu/projeto' });
    expect(state.inputPath).toBe('/meu/projeto');
  });

  it('SET_OUTPUT atualiza outputDir', () => {
    const state = dispatch({ type: 'SET_OUTPUT', outputDir: './output/x' });
    expect(state.outputDir).toBe('./output/x');
  });

  it('SET_FORCE atualiza flag force', () => {
    const state = dispatch({ type: 'SET_FORCE', force: true });
    expect(state.force).toBe(true);
  });
});

describe('tuiReducer — fases do pipeline', () => {
  it('todas as fases iniciam como idle', () => {
    const { phases } = INITIAL_SESSION;
    expect(phases.analyze).toBe('idle');
    expect(phases.plan).toBe('idle');
    expect(phases.validate).toBe('idle');
    expect(phases.migrate).toBe('idle');
    expect(phases.deploy).toBe('idle');
    expect(phases.execute).toBe('idle');
    expect(phases.remote).toBe('idle');
  });

  it('SET_PHASE atualiza fase individual sem mutar outras', () => {
    const state = dispatch({ type: 'SET_PHASE', phase: 'analyze', status: 'running' });
    expect(state.phases.analyze).toBe('running');
    expect(state.phases.plan).toBe('idle');
    expect(state.phases.migrate).toBe('idle');
  });

  it('sequência running → done', () => {
    let state = tuiReducer(INITIAL_SESSION, { type: 'SET_PHASE', phase: 'analyze', status: 'running' });
    expect(state.phases.analyze).toBe('running');
    state = tuiReducer(state, { type: 'SET_PHASE', phase: 'analyze', status: 'done' });
    expect(state.phases.analyze).toBe('done');
  });

  it('SET_ACTIVE_PHASE registra fase ativa', () => {
    const state = dispatch({ type: 'SET_ACTIVE_PHASE', phase: 'plan' });
    expect(state.activePhase).toBe('plan');
  });

  it('SET_ACTIVE_PHASE null limpa fase ativa', () => {
    let state = dispatch({ type: 'SET_ACTIVE_PHASE', phase: 'plan' });
    state = tuiReducer(state, { type: 'SET_ACTIVE_PHASE', phase: null });
    expect(state.activePhase).toBeNull();
  });
});

describe('tuiReducer — logs', () => {
  it('ADD_LOG acumula linhas', () => {
    let state = dispatch({ type: 'ADD_LOG', line: 'linha 1' });
    state = tuiReducer(state, { type: 'ADD_LOG', line: 'linha 2' });
    expect(state.logs).toEqual(['linha 1', 'linha 2']);
  });

  it('ADD_LOG mantém no máximo 100 linhas', () => {
    let state = INITIAL_SESSION;
    for (let i = 0; i < 105; i++) {
      state = tuiReducer(state, { type: 'ADD_LOG', line: `log-${i}` });
    }
    expect(state.logs.length).toBe(100);
    expect(state.logs[99]).toBe('log-104');
  });

  it('CLEAR_LOGS esvazia o buffer', () => {
    let state = dispatch({ type: 'ADD_LOG', line: 'algo' });
    state = tuiReducer(state, { type: 'CLEAR_LOGS' });
    expect(state.logs).toEqual([]);
  });
});
