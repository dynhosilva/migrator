import type { ProjectContext } from '../core/types';
import type { RuntimeState } from './types';

export interface RuntimeTaskContext {
  readonly ctx: ProjectContext;
  readonly partial: Partial<RuntimeState>;
  readonly outputDir: string;
  readonly projectDir: string;
}

export interface RuntimeTask<K extends keyof RuntimeState> {
  readonly key: K;
  run(taskCtx: RuntimeTaskContext): Promise<RuntimeState[K]>;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyRuntimeTask = RuntimeTask<any>;

/**
 * Registry assíncrono de tasks de runtime.
 *
 * Diferente dos outros registries (que são síncronos), o RuntimeRegistry
 * executa tasks em sequência com await — necessário porque as tasks invocam
 * processos reais (npm, docker) e dependem dos resultados anteriores.
 */
export class RuntimeRegistry {
  private readonly tasks: AnyRuntimeTask[] = [];

  register<K extends keyof RuntimeState>(task: RuntimeTask<K>): this {
    this.tasks.push(task);
    return this;
  }

  async run(
    ctx: ProjectContext,
    outputDir: string,
    projectDir: string,
  ): Promise<Partial<RuntimeState>> {
    let partial: Partial<RuntimeState> = {};

    for (const task of this.tasks) {
      const value = (await task.run({ ctx, partial, outputDir, projectDir })) as unknown;
      partial = { ...partial, [task.key]: value };
    }

    return partial;
  }
}
