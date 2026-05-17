import type { ProjectContext } from '../core/types';
import type { GuideState, GuideConfig } from './types';

/**
 * Contexto passado para cada task do guide.
 *
 * `partial` permite que tasks posteriores leiam resultados de tasks anteriores —
 * mantemos o padrão dos demais registries (deploy, remote, executor).
 */
export interface GuideTaskContext {
  readonly ctx: ProjectContext;
  readonly partial: Partial<GuideState>;
  readonly outputDir: string;
  readonly config: GuideConfig;
}

export interface GuideTask<K extends keyof GuideState> {
  readonly key: K;
  run(taskCtx: GuideTaskContext): GuideState[K];
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyGuideTask = GuideTask<any>;

/**
 * Registry síncrono de tasks de geração de guia.
 *
 * Síncrono porque todas as tasks são puro template rendering — não há I/O
 * além da escrita final dos artefatos por `writeGeneratedFiles`.
 *
 * Padrão idêntico ao RemoteRegistry: tasks acumulam `Partial<GuideState>` via
 * reduce imutável. Para adicionar uma nova capacidade (checklist, scripts,
 * nginx, troubleshooting), basta criar o arquivo da task e registrar aqui —
 * zero alteração no orquestrador.
 */
export class GuideRegistry {
  private readonly tasks: AnyGuideTask[] = [];

  register<K extends keyof GuideState>(task: GuideTask<K>): this {
    this.tasks.push(task);
    return this;
  }

  run(
    ctx: ProjectContext,
    outputDir: string,
    config: GuideConfig,
  ): Partial<GuideState> {
    return this.tasks.reduce<Partial<GuideState>>((partial, task) => {
      const value = task.run({ ctx, partial, outputDir, config }) as unknown;
      return { ...partial, [task.key]: value };
    }, {});
  }
}
