/**
 * App — router raiz da TUI.
 *
 * Mapeia `session.screen` para a screen correta e orquestra
 * transições via `useNavigation` + `usePipeline`.
 * Nenhuma lógica de domínio vive aqui.
 */

import React from 'react';
import { Box } from 'ink';

import { useSession }    from './hooks/useSession';
import { useNavigation } from './hooks/useNavigation';
import { usePipeline }   from './hooks/usePipeline';

import { Welcome }         from './screens/Welcome';
import { ProjectSelect }   from './screens/ProjectSelect';
import { PhaseRunner }     from './screens/PhaseRunner';
import { AnalyzeReview }   from './screens/AnalyzeReview';
import { PlanReview }      from './screens/PlanReview';
import { RiskReview }      from './screens/RiskReview';
import { ValidateReview }  from './screens/ValidateReview';
import { ConfirmScreen }   from './screens/ConfirmScreen';
import { DryRunReview }    from './screens/DryRunReview';
import { ArtifactBrowser } from './screens/ArtifactBrowser';
import { Summary }         from './screens/Summary';
import { ErrorScreen }     from './screens/ErrorScreen';

export function App(): React.ReactElement {
  const [session, dispatch] = useSession();
  const nav      = useNavigation(dispatch);
  const pipeline = usePipeline(dispatch);

  // ─── Handlers de transição ─────────────────────────────────────────────────

  async function handleProjectSubmit(inputPath: string, outputDir: string) {
    dispatch({ type: 'SET_INPUT',  inputPath });
    dispatch({ type: 'SET_OUTPUT', outputDir });
    dispatch({ type: 'SET_SCREEN', screen: 'phase-runner' });

    const base     = await pipeline.load(inputPath);
    if (!base) return;

    const analyzed = await pipeline.analyze(base);
    if (!analyzed) return;

    const planned  = await pipeline.plan(analyzed);
    if (!planned) return;

    dispatch({ type: 'SET_CTX', ctx: planned });
    nav.goTo('analyze-review');
  }

  async function handleAnalyzeNext() {
    if (!session.ctx) return;
    nav.goTo('phase-runner');

    const validated = await pipeline.validate(session.ctx);
    if (!validated) return;

    nav.goTo('plan-review');
  }

  async function handleMigrateConfirm() {
    if (!session.ctx) return;
    nav.goTo('phase-runner');

    const migrated = await pipeline.migrate(session.ctx, session.outputDir);
    if (!migrated) return;

    const executed = await pipeline.execute(migrated, session.outputDir);
    if (!executed) return;

    const prepared = await pipeline.remote(executed, session.outputDir);
    if (!prepared) return;

    nav.goTo('dry-run-review');
  }

  // ─── Router ────────────────────────────────────────────────────────────────

  const { screen, ctx } = session;

  return (
    <Box>
      {screen === 'welcome' && (
        <Welcome nav={nav} />
      )}

      {screen === 'project-select' && (
        <ProjectSelect
          inputPath={session.inputPath}
          outputDir={session.outputDir}
          dispatch={dispatch}
          nav={nav}
          onSubmit={handleProjectSubmit}
        />
      )}

      {screen === 'phase-runner' && (
        <PhaseRunner
          phases={session.phases}
          activePhase={session.activePhase}
          logs={session.logs}
        />
      )}

      {screen === 'analyze-review' && ctx?.analysis && (
        <AnalyzeReview
          analysis={ctx.analysis}
          nav={nav}
          onNext={() => nav.goTo('plan-review')}
        />
      )}

      {screen === 'plan-review' && ctx?.plan && (
        <PlanReview
          plan={ctx.plan}
          nav={nav}
          onNext={() => nav.goTo('risk-review')}
        />
      )}

      {screen === 'risk-review' && ctx?.plan && (
        <RiskReview
          plan={ctx.plan}
          nav={nav}
          onNext={() => nav.goTo('validate-review')}
        />
      )}

      {screen === 'validate-review' && ctx?.validation && (
        <ValidateReview
          validation={ctx.validation}
          force={session.force}
          dispatch={dispatch}
          nav={nav}
          onNext={() => nav.goTo('confirm-migrate')}
        />
      )}

      {screen === 'confirm-migrate' && (
        <ConfirmScreen
          subtitle="Confirmar migração"
          message={`Gerar artefatos em: ${session.outputDir}\nIsso criará arquivos no disco. Confirmar?`}
          onConfirm={handleMigrateConfirm}
          onCancel={() => nav.goTo('validate-review')}
        />
      )}

      {screen === 'dry-run-review' && ctx?.execution && (
        <DryRunReview
          execution={ctx.execution}
          outputDir={session.outputDir}
          nav={nav}
          onNext={() => nav.goTo('summary')}
        />
      )}

      {screen === 'artifact-browser' && (
        <ArtifactBrowser
          outputDir={session.outputDir}
          nav={nav}
          onClose={() => nav.goTo('summary')}
        />
      )}

      {screen === 'summary' && ctx && (
        <Summary
          ctx={ctx}
          outputDir={session.outputDir}
          nav={nav}
        />
      )}

      {screen === 'error' && (
        <ErrorScreen
          message={session.error ?? 'Erro desconhecido'}
          nav={nav}
        />
      )}
    </Box>
  );
}
