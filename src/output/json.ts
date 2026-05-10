import type { Renderer } from './renderer';
import type { ProjectContext } from '../core/types';

/** Renderizador JSON — útil para integrações, APIs e pipelines automatizados. */
export class JsonRenderer implements Renderer {
  render(ctx: ProjectContext): void {
    const output = ctx.analysis ?? { error: 'Sem análise disponível no contexto.' };
    console.log(JSON.stringify(output, null, 2));
  }
}
