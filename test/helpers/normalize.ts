/**
 * Utilitários de normalização para testes de snapshot.
 *
 * Remove variações de ambiente (paths absolutos, timestamps, separadores de SO)
 * dos resultados do pipeline, garantindo snapshots estáveis entre plataformas
 * (Windows/Linux) e entre execuções (timestamps diferentes a cada run).
 */

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const TIMESTAMP_RE = /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z/g;

function normalizeValue(value: unknown, replacements: [RegExp, string][]): unknown {
  if (typeof value === 'string') {
    // Normaliza separadores de caminho antes dos outros replacements
    let result = value.replace(/\\/g, '/');
    for (const [re, replacement] of replacements) {
      result = result.replace(re, replacement);
    }
    return result;
  }
  if (Array.isArray(value)) {
    return value.map((item) => normalizeValue(item, replacements));
  }
  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([k, v]) => [
        k,
        normalizeValue(v, replacements),
      ]),
    );
  }
  return value;
}

export interface NormalizeDirs {
  fixtureDir?: string;
  outputDir?: string;
}

/**
 * Normaliza um valor para uso em snapshots:
 * - Converte backslashes → forward slashes
 * - Substitui timestamps ISO por <TIMESTAMP>
 * - Substitui caminhos absolutos conhecidos por placeholders
 */
export function normalizeOutput(value: unknown, dirs: NormalizeDirs = {}): unknown {
  const replacements: [RegExp, string][] = [
    [TIMESTAMP_RE, '<TIMESTAMP>'],
  ];

  if (dirs.fixtureDir) {
    const norm = dirs.fixtureDir.replace(/\\/g, '/');
    replacements.push([new RegExp(escapeRegex(norm), 'g'), '<FIXTURE_DIR>']);
  }

  if (dirs.outputDir) {
    const norm = dirs.outputDir.replace(/\\/g, '/');
    replacements.push([new RegExp(escapeRegex(norm), 'g'), '<OUTPUT_DIR>']);
  }

  return normalizeValue(value, replacements);
}

/** Normaliza apenas timestamps (sem substituir paths). */
export function normalizeTimestamps(value: unknown): unknown {
  return normalizeValue(value, [[TIMESTAMP_RE, '<TIMESTAMP>']]);
}

/** Normaliza apenas separadores de caminho (backslash → forward slash). */
export function normalizePaths(value: unknown): unknown {
  return normalizeValue(value, []);
}
