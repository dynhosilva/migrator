import type { ProjectContext } from '../core/types';

/**
 * Contrato único para todas as implementações de renderização.
 *
 * O analyzer não deve depender de nenhuma implementação concreta —
 * só desta interface. Isso desacopla apresentação de lógica de análise
 * e permite saídas terminal, JSON, HTML ou API sem mudar o core.
 */
export interface Renderer {
  render(ctx: ProjectContext): void;
}
