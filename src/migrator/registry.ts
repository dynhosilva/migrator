import type { ProjectContext } from '../core/types';
import type { MigrationResult } from './types';

/**
 * Contexto passado a cada task durante a execução do registry.
 *
 * `ctx` expõe o ProjectContext completo (files, analysis, plan).
 * `partial` expõe os resultados já computados pelas tasks anteriores —
 * útil para tasks que dependem de resultados de outras (ex: summaryGenerator).
 */
export interface TaskContext {
  readonly ctx: ProjectContext;
  readonly partial: Partial<MigrationResult>;
}

/**
 * Contrato de uma migration task.
 * K é a chave de MigrationResult que esta task preenche.
 *
 * Tasks são puras e stateless: dados os mesmos inputs, produzem o mesmo output.
 * Tasks nunca escrevem em disco — apenas retornam GeneratedFile[].
 * Toda escrita em disco acontece no writer.ts, fora do registry.
 */
export interface MigrationTask<K extends keyof MigrationResult> {
  readonly key: K;
  run(ctx: TaskContext): MigrationResult[K];
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyTask = MigrationTask<any>;

/**
 * Registry central de tasks do migrator.
 *
 * Tasks são executadas na ordem em que foram registradas.
 * Para adicionar nova task: .register({ key: 'minhaChave', run: ... })
 */
export class MigratorRegistry {
  private readonly tasks: AnyTask[] = [];

  /** Registra uma task. A ordem de chamada define a ordem de execução. */
  register<K extends keyof MigrationResult>(task: MigrationTask<K>): this {
    this.tasks.push(task);
    return this;
  }

  /** Executa todas as tasks em sequência, acumulando resultados. */
  run(ctx: ProjectContext): Partial<MigrationResult> {
    return this.tasks.reduce<Partial<MigrationResult>>((partial, task) => {
      // Cast controlado: o contrato MigrationTask<K> garante tipo correto no registro.
      const value = task.run({ ctx, partial }) as unknown;
      return { ...partial, [task.key]: value };
    }, {});
  }
}
