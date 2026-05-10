import type { ProjectFile } from '../sources/types';
import type { PackageJson, AnalysisReport } from './types';

/**
 * Contexto passado a cada detector durante a execução do registry.
 * O campo `partial` expõe os resultados já computados por detectores
 * anteriores — útil para detectores com dependências (ex: routes → framework).
 */
export interface DetectorContext {
  files: ProjectFile[];
  packageJson: PackageJson | null;
  partial: Partial<AnalysisReport>;
}

/**
 * Contrato de um detector.
 * K é a chave de AnalysisReport que este detector preenche.
 *
 * Detectores são stateless e puros: dados os mesmos inputs, produzem
 * o mesmo output. Nunca mutam o contexto — apenas retornam um valor.
 */
export interface Detector<K extends keyof AnalysisReport> {
  readonly key: K;
  detect(ctx: DetectorContext): AnalysisReport[K];
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyDetector = Detector<any>;

/**
 * Registry central de detectores.
 *
 * Detectores são executados na ordem em que foram registrados.
 * Isso garante que detectores dependentes (ex: routes depende de framework)
 * possam acessar resultados anteriores via `ctx.partial`.
 *
 * Fases futuras (planner, migrator) podem criar seus próprios registries
 * seguindo este mesmo padrão, sem alterar o registry do analyzer.
 */
export class DetectorRegistry {
  private readonly detectors: AnyDetector[] = [];

  /** Registra um detector. A ordem de chamada define a ordem de execução. */
  register<K extends keyof AnalysisReport>(detector: Detector<K>): this {
    this.detectors.push(detector);
    return this;
  }

  /** Executa todos os detectores em sequência, acumulando resultados em `partial`. */
  run(files: ProjectFile[], packageJson: PackageJson | null): Partial<AnalysisReport> {
    return this.detectors.reduce<Partial<AnalysisReport>>((partial, detector) => {
      // Cast controlado: o contrato Detector<K> garante tipo correto no registro.
      const value = detector.detect({ files, packageJson, partial }) as unknown;
      return { ...partial, [detector.key]: value };
    }, {});
  }
}
