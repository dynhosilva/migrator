import type { Renderer } from './renderer';
import type { ProjectContext } from '../core/types';

/** Renderizador JSON — útil para integrações, APIs e pipelines automatizados. */
export class JsonRenderer implements Renderer {
  render(ctx: ProjectContext): void {
    if (!ctx.analysis && !ctx.plan) {
      console.log(JSON.stringify({ error: 'Sem dados disponíveis no contexto.' }, null, 2));
      return;
    }
    const output: Record<string, unknown> = {};
    if (ctx.analysis)   output['analysis']   = ctx.analysis;
    if (ctx.plan)       output['plan']       = ctx.plan;
    if (ctx.validation) output['validation'] = ctx.validation;
    if (ctx.migration)  output['migration']  = ctx.migration;
    if (ctx.deploy)     output['deploy']     = ctx.deploy;
    if (ctx.execution)  output['execution']  = ctx.execution;
    if (ctx.runtime)    output['runtime']    = ctx.runtime;
    console.log(JSON.stringify(output, null, 2));
  }
}
