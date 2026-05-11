/**
 * usePipeline — wrapper assíncrono sobre a engine.
 *
 * Cada função chama o módulo correspondente da engine, despacha
 * status para o estado da sessão e retorna o contexto enriquecido.
 * Nenhuma lógica de domínio vive aqui — apenas orquestração e tratamento de erro.
 */

import React from 'react';
import path  from 'path';

import { resolveSource }   from '../../sources';
import { createContext }   from '../../core';
import { analyzeContext }  from '../../analyzer';
import { planContext }     from '../../planner';
import { validateContext } from '../../validator';
import { migrateContext }  from '../../migrator';
import { deployContext }   from '../../deploy';
import { executeContext }  from '../../executor';
import { prepareContext }  from '../../remote';
import type { ProjectContext } from '../../core/types';
import type { TuiAction, PhaseState } from '../state/types';

type Dispatch = React.Dispatch<TuiAction>;

function setPhase(dispatch: Dispatch, phase: keyof PhaseState, status: 'running' | 'done' | 'failed') {
  dispatch({ type: 'SET_PHASE', phase, status });
  dispatch({ type: 'SET_ACTIVE_PHASE', phase: status === 'running' ? phase : null });
}

function fail(dispatch: Dispatch, phase: keyof PhaseState, err: unknown): null {
  setPhase(dispatch, phase, 'failed');
  dispatch({ type: 'SET_ERROR', error: (err as Error).message ?? String(err) });
  return null;
}

export function usePipeline(dispatch: Dispatch) {
  return React.useMemo(() => ({

    async load(inputPath: string): Promise<ProjectContext | null> {
      try {
        const source = resolveSource(inputPath);
        const files  = await source.load();
        const name   = path.basename(inputPath).replace(/\.zip$/i, '');
        return createContext(source, inputPath, name, files);
      } catch (err) {
        dispatch({ type: 'SET_ERROR', error: (err as Error).message ?? String(err) });
        return null;
      }
    },

    async analyze(ctx: ProjectContext): Promise<ProjectContext | null> {
      setPhase(dispatch, 'analyze', 'running');
      try {
        const result = analyzeContext(ctx);
        setPhase(dispatch, 'analyze', 'done');
        dispatch({ type: 'SET_CTX', ctx: result });
        return result;
      } catch (err) {
        return fail(dispatch, 'analyze', err);
      }
    },

    async plan(ctx: ProjectContext): Promise<ProjectContext | null> {
      setPhase(dispatch, 'plan', 'running');
      try {
        const result = planContext(ctx);
        setPhase(dispatch, 'plan', 'done');
        dispatch({ type: 'SET_CTX', ctx: result });
        return result;
      } catch (err) {
        return fail(dispatch, 'plan', err);
      }
    },

    async validate(ctx: ProjectContext): Promise<ProjectContext | null> {
      setPhase(dispatch, 'validate', 'running');
      try {
        const result = validateContext(ctx);
        setPhase(dispatch, 'validate', 'done');
        dispatch({ type: 'SET_CTX', ctx: result });
        return result;
      } catch (err) {
        return fail(dispatch, 'validate', err);
      }
    },

    async migrate(ctx: ProjectContext, outputDir: string): Promise<ProjectContext | null> {
      setPhase(dispatch, 'migrate', 'running');
      try {
        const migrated = migrateContext(ctx, outputDir);
        setPhase(dispatch, 'migrate', 'done');

        setPhase(dispatch, 'deploy', 'running');
        const deployed = deployContext(migrated, outputDir);
        setPhase(dispatch, 'deploy', 'done');

        dispatch({ type: 'SET_CTX', ctx: deployed });
        return deployed;
      } catch (err) {
        return fail(dispatch, 'migrate', err);
      }
    },

    async execute(ctx: ProjectContext, outputDir: string): Promise<ProjectContext | null> {
      setPhase(dispatch, 'execute', 'running');
      try {
        const result = executeContext(ctx, outputDir);
        setPhase(dispatch, 'execute', 'done');
        dispatch({ type: 'SET_CTX', ctx: result });
        return result;
      } catch (err) {
        return fail(dispatch, 'execute', err);
      }
    },

    async remote(ctx: ProjectContext, outputDir: string): Promise<ProjectContext | null> {
      setPhase(dispatch, 'remote', 'running');
      try {
        const result = prepareContext(ctx, outputDir);
        setPhase(dispatch, 'remote', 'done');
        dispatch({ type: 'SET_CTX', ctx: result });
        return result;
      } catch (err) {
        return fail(dispatch, 'remote', err);
      }
    },

  }), [dispatch]);
}
