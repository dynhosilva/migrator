// Regra de ignore: nome exato ("node_modules") ou padrão de extensão ("*.log").
export type IgnoreRule = string;

export const DEFAULT_IGNORE: IgnoreRule[] = [
  'node_modules',
  'dist',
  'build',
  '.git',
  '.next',
  'coverage',
  '*.log',
  '*.zip',
];

function matchesRule(rule: IgnoreRule, segment: string): boolean {
  if (rule.startsWith('*.')) {
    return segment.endsWith(rule.slice(1));
  }
  return segment === rule;
}

/**
 * Retorna uma função que decide se um segmento de caminho deve ser ignorado.
 * Combina as regras padrão com quaisquer regras extras fornecidas.
 */
export function createIgnoreFilter(extraRules: IgnoreRule[] = []): (segment: string) => boolean {
  const rules = [...DEFAULT_IGNORE, ...extraRules];
  return (segment: string) => rules.some((rule) => matchesRule(rule, segment));
}

/**
 * Retorna true se qualquer segmento do caminho (separado por "/") for ignorado.
 * Usado para filtrar entradas de ZIP onde o caminho completo está disponível.
 */
export function isPathIgnored(
  filePath: string,
  isIgnored: (segment: string) => boolean
): boolean {
  return filePath.split('/').some(isIgnored);
}
