import type { ProjectContext } from '../core/types';
import type { RemoteState, RemoteConfig } from './types';

export interface RemoteTaskContext {
  readonly ctx: ProjectContext;
  readonly partial: Partial<RemoteState>;
  readonly outputDir: string;
  readonly config: RemoteConfig;
}

export interface RemoteTask<K extends keyof RemoteState> {
  readonly key: K;
  run(taskCtx: RemoteTaskContext): RemoteState[K];
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyRemoteTask = RemoteTask<any>;

/**
 * Registry síncrono de tasks de modelagem remota.
 *
 * Ao contrário do RuntimeRegistry (async), o RemoteRegistry é síncrono porque
 * todas as tasks são pure planning — não há I/O de rede, processos ou sistema
 * de arquivos além da escrita final dos artefatos gerados.
 */
export class RemoteRegistry {
  private readonly tasks: AnyRemoteTask[] = [];

  register<K extends keyof RemoteState>(task: RemoteTask<K>): this {
    this.tasks.push(task);
    return this;
  }

  run(
    ctx: ProjectContext,
    outputDir: string,
    config: RemoteConfig,
  ): Partial<RemoteState> {
    return this.tasks.reduce<Partial<RemoteState>>((partial, task) => {
      const value = task.run({ ctx, partial, outputDir, config }) as unknown;
      return { ...partial, [task.key]: value };
    }, {});
  }
}
