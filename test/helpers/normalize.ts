/**
 * Utilitários de normalização para testes de snapshot.
 *
 * Remove variações de ambiente (paths absolutos, timestamps, versões de ferramentas,
 * separadores de SO, line endings) dos resultados do pipeline, garantindo snapshots
 * estáveis entre plataformas (Windows/Linux/macOS) e entre execuções.
 */

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Timestamps ISO: 2026-05-11T00:00:00.000Z
const TIMESTAMP_RE = /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z/g;

// Versões com prefixo v: v18.20.4, v24.14.0 (node --version, docker --version)
const VERSION_V_RE = /\bv\d+\.\d+\.\d+[\w.+-]*/g;

// Versões em células de tabela markdown após ✓/✗:
// | npm | ✓ | 11.9.0 |  →  | npm | ✓ | <VERSION> |
// Captura apenas o padrão específico do dry-run-generator, não versões em JSON genérico
const VERSION_TABLE_RE = /(\|\s*[✓✗]\s*\|\s*)(\d[\d.]+)(\s*\|)/g;

// Chaves de objeto cujos valores são strings de versão de ferramenta
const VERSION_KEYS = new Set([
  'nodeVersion',
  'detectedNodeVersion',
  'packageManagerVersion',
  'dockerVersion',
]);

function normalizeValue(value: unknown, replacements: [RegExp, string][]): unknown {
  if (typeof value === 'string') {
    // Normaliza CRLF → LF antes de qualquer outra coisa
    let result = value.replace(/\r\n/g, '\n');
    // Normaliza separadores de caminho
    result = result.replace(/\\/g, '/');
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
      Object.entries(value as Record<string, unknown>).map(([k, v]) => {
        // Normalização por chave: campos de versão de ferramenta → <VERSION>
        if (VERSION_KEYS.has(k) && v !== null && typeof v === 'string') {
          return [k, '<VERSION>'];
        }
        return [k, normalizeValue(v, replacements)];
      }),
    );
  }
  return value;
}

export interface NormalizeDirs {
  fixtureDir?: string;
  outputDir?: string;
  projectDir?: string;
}

/**
 * Normaliza um valor para uso em snapshots:
 * - Converte CRLF → LF
 * - Converte backslashes → forward slashes
 * - Substitui timestamps ISO por <TIMESTAMP>
 * - Substitui versões de ferramentas (v18.x, v24.x) por <VERSION>
 * - Substitui versões em tabela markdown de ambiente por <VERSION>
 * - Substitui valores de campos de versão de ferramenta conhecidos por <VERSION>
 * - Substitui caminhos absolutos conhecidos por placeholders
 */
export function normalizeOutput(value: unknown, dirs: NormalizeDirs = {}): unknown {
  const replacements: [RegExp, string][] = [
    [TIMESTAMP_RE,    '<TIMESTAMP>'],
    [VERSION_V_RE,    '<VERSION>'],
    [VERSION_TABLE_RE, '$1<VERSION>$3'],
  ];

  if (dirs.fixtureDir) {
    const norm = dirs.fixtureDir.replace(/\\/g, '/');
    replacements.push([new RegExp(escapeRegex(norm), 'g'), '<FIXTURE_DIR>']);
  }

  if (dirs.outputDir) {
    const norm = dirs.outputDir.replace(/\\/g, '/');
    replacements.push([new RegExp(escapeRegex(norm), 'g'), '<OUTPUT_DIR>']);
  }

  if (dirs.projectDir) {
    const norm = dirs.projectDir.replace(/\\/g, '/');
    replacements.push([new RegExp(escapeRegex(norm), 'g'), '<PROJECT_DIR>']);
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

/**
 * Normaliza campos dinâmicos específicos do runtime-log.json:
 * - durationMs → <DURATION_MS> (varia entre execuções)
 * - exitCode → <EXIT_CODE> (varia entre plataformas e disponibilidade de rede)
 * - success → <SUCCESS> (derivado de exitCode, portanto também varia)
 * - stdoutSummary, stderrSummary, stdout, stderr → <REDACTED> (conteúdo do SO varia)
 */
export function normalizeRuntimeLog(value: unknown, dirs: NormalizeDirs = {}): unknown {
  const normalized = normalizeOutput(value, dirs);
  return replaceRuntimeDynamics(normalized);
}

function replaceRuntimeDynamics(value: unknown): unknown {
  if (value === null || typeof value !== 'object') return value;

  if (Array.isArray(value)) {
    return value.map(replaceRuntimeDynamics);
  }

  const obj = value as Record<string, unknown>;
  const result: Record<string, unknown> = {};

  for (const [key, val] of Object.entries(obj)) {
    if (key === 'durationMs') {
      result[key] = '<DURATION_MS>';
    } else if (key === 'exitCode') {
      result[key] = '<EXIT_CODE>';
    } else if (key === 'success') {
      result[key] = '<SUCCESS>';
    } else if (key === 'stdoutSummary' || key === 'stderrSummary' || key === 'stdout' || key === 'stderr') {
      result[key] = val === '' ? '' : '<REDACTED>';
    } else {
      result[key] = replaceRuntimeDynamics(val);
    }
  }

  return result;
}
