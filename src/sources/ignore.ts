// Regra de ignore: nome exato ("node_modules") ou padrão de extensão ("*.log").
export type IgnoreRule = string;

// Artefatos de build e dependências — nunca devem ser analisados.
const BUILD_IGNORE: IgnoreRule[] = [
  'node_modules',
  'dist',
  'build',
  '.git',
  '.next',
  'coverage',
  '*.log',
  '*.zip',
];

/**
 * Artefatos de workspace — projetos auxiliares, exemplos e fixtures que vivem
 * no repositório da engine mas não são o alvo da análise.
 *
 * Qualquer diretório com esses nomes convencionais é excluído automaticamente,
 * evitando contaminação do analyzer com conteúdo interno do workspace.
 *
 * Para ignorar projetos com nomes arbitrários, passe-os via extraIgnore
 * nas classes de source (LocalFolderSource, ZipSource, GitHubSource).
 */
export const WORKSPACE_ARTIFACT_IGNORE: IgnoreRule[] = [
  'test',
  'teste',
  'examples',
  'fixtures',
];

export const DEFAULT_IGNORE: IgnoreRule[] = [
  ...BUILD_IGNORE,
  ...WORKSPACE_ARTIFACT_IGNORE,
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
