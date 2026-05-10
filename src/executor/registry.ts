import type { ProjectContext } from '../core/types';
import type { ExecutionState } from './types';

export interface ExecutorTaskContext {
  readonly ctx: ProjectContext;
  readonly partial: Partial<ExecutionState>;
  readonly outputDir: string;
}

export interface ExecutorTask<K extends keyof ExecutionState> {
  readonly key: K;
  run(taskCtx: ExecutorTaskContext): ExecutionState[K];
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyExecutorTask = ExecutorTask<any>;

export class ExecutorRegistry {
  private readonly tasks: AnyExecutorTask[] = [];

  register<K extends keyof ExecutionState>(task: ExecutorTask<K>): this {
    this.tasks.push(task);
    return this;
  }

  run(ctx: ProjectContext, outputDir: string): Partial<ExecutionState> {
    return this.tasks.reduce<Partial<ExecutionState>>((partial, task) => {
      const value = task.run({ ctx, partial, outputDir }) as unknown;
      return { ...partial, [task.key]: value };
    }, {});
  }
}
