import type { ProjectContext } from '../core/types';
import type { CicdState } from './types';

export interface CicdTaskContext {
  readonly ctx: ProjectContext;
  readonly partial: Partial<CicdState>;
  readonly outputDir: string;
}

export interface CicdTask<K extends keyof CicdState> {
  readonly key: K;
  run(taskCtx: CicdTaskContext): CicdState[K];
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyCicdTask = CicdTask<any>;

export class CicdRegistry {
  private readonly tasks: AnyCicdTask[] = [];

  register<K extends keyof CicdState>(task: CicdTask<K>): this {
    this.tasks.push(task);
    return this;
  }

  run(ctx: ProjectContext, outputDir: string): Partial<CicdState> {
    return this.tasks.reduce<Partial<CicdState>>((partial, task) => {
      const value = task.run({ ctx, partial, outputDir }) as unknown;
      return { ...partial, [task.key]: value };
    }, {});
  }
}
