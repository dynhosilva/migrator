import type { AnalysisReport } from '../analyzer/types';
import type { MigrationPlan } from './types';

/**
 * Contexto passado a cada strategy durante a execução do registry.
 * O campo `partial` expõe os resultados já computados por strategies
 * anteriores — útil para strategies com dependências (ex: deploy → compatibility).
 */
export interface StrategyContext {
  readonly analysis: AnalysisReport;
  readonly partial: Partial<MigrationPlan>;
}

/**
 * Contrato de uma strategy de planejamento.
 * K é a chave de MigrationPlan que esta strategy preenche.
 *
 * Strategies são stateless e puras: dados os mesmos inputs, produzem
 * o mesmo output. Nunca mutam o contexto — apenas retornam um valor.
 */
export interface Strategy<K extends keyof MigrationPlan> {
  readonly key: K;
  plan(ctx: StrategyContext): MigrationPlan[K];
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyStrategy = Strategy<any>;

/**
 * Registry central de strategies do planner.
 *
 * Strategies são executadas na ordem em que foram registradas.
 * Isso garante que strategies dependentes (ex: deployStrategy depende de compatibility)
 * possam acessar resultados anteriores via `ctx.partial`.
 *
 * Para adicionar nova strategy: .register({ key: 'minhaChave', plan: ... })
 * Sem precisar alterar mais nada neste arquivo.
 */
export class PlannerRegistry {
  private readonly strategies: AnyStrategy[] = [];

  /** Registra uma strategy. A ordem de chamada define a ordem de execução. */
  register<K extends keyof MigrationPlan>(strategy: Strategy<K>): this {
    this.strategies.push(strategy);
    return this;
  }

  /** Executa todas as strategies em sequência, acumulando resultados em `partial`. */
  run(analysis: AnalysisReport): Partial<MigrationPlan> {
    return this.strategies.reduce<Partial<MigrationPlan>>((partial, strategy) => {
      // Cast controlado: o contrato Strategy<K> garante tipo correto no registro.
      const value = strategy.plan({ analysis, partial }) as unknown;
      return { ...partial, [strategy.key]: value };
    }, {});
  }
}
