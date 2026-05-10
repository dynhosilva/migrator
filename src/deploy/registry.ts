import type { ProjectContext } from '../core/types';
import type { DeployState } from './types';

export interface DeployTaskContext {
  readonly ctx: ProjectContext;
  readonly partial: Partial<DeployState>;
}

export interface DeployTask<K extends keyof DeployState> {
  readonly key: K;
  run(ctx: DeployTaskContext): DeployState[K];
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyDeployTask = DeployTask<any>;

export class DeployerRegistry {
  private readonly tasks: AnyDeployTask[] = [];

  register<K extends keyof DeployState>(task: DeployTask<K>): this {
    this.tasks.push(task);
    return this;
  }

  run(ctx: ProjectContext): Partial<DeployState> {
    return this.tasks.reduce<Partial<DeployState>>((partial, task) => {
      const value = task.run({ ctx, partial }) as unknown;
      return { ...partial, [task.key]: value };
    }, {});
  }
}
