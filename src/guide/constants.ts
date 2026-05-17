/**
 * Constantes compartilhadas entre as tasks do módulo guide.
 *
 * Existem aqui (e não em uma task específica) para que tasks irmãs possam
 * referenciar valores estáveis (filenames de scripts, sentinels, paths) sem
 * criar dependência cruzada entre arquivos de `tasks/`.
 *
 * Regra: nada nesse arquivo deve depender de tasks. Apenas tipos do módulo
 * podem ser importados (de `./types`). Se algo aqui crescer para incluir
 * lógica, mova para uma task dedicada.
 */

import type { BashScriptKey } from './types';

// ─── Sentinel para "não configurado" ──────────────────────────────────────────

/**
 * Sentinel usado em scripts bash para sinalizar que o usuário não forneceu
 * um valor obrigatório ao gerar o pacote (ex: domínio, email do Certbot).
 *
 * Quando o script encontra esse valor em runtime, aborta com mensagem útil
 * pedindo o argumento correto. Centralizado aqui para evitar drift entre o
 * gerador (que injeta o valor) e os checks de runtime (que comparam contra ele).
 */
export const UNCONFIGURED = '__NAO_CONFIGURADO__';

// ─── Diretório de scripts ─────────────────────────────────────────────────────

/**
 * Diretório (relativo ao outputDir) onde todos os scripts bash são gerados.
 *
 * Referenciado pelo gerador, pelo checklist, pelo DEPLOY.md e pelo renderer.
 * Mudança aqui = mudança automática em todos os consumidores.
 */
export const SCRIPTS_DIR = 'deployment-guide/scripts';

// ─── Filenames estáveis ───────────────────────────────────────────────────────

/**
 * Filenames estáveis indexados por chave semântica.
 *
 * `BashScriptKey` é a identidade semântica (não muda); o filename pode mudar
 * (renomear, renumerar) sem quebrar referências, porque tudo passa por esse map.
 */
export const SCRIPT_FILENAMES: Readonly<Record<BashScriptKey, string>> = {
  'setup-vps':      '01-setup-vps.sh',
  'install-docker': '02-install-docker.sh',
  'upload':         '03-upload-app.sh',
  'deploy':         '04-deploy-app.sh',
  'ssl':            '05-setup-ssl.sh',
  'health-check':   '06-health-check.sh',
} as const;

/**
 * Path relativo (a partir de CHECKLIST.md) usado em `ChecklistItem.scriptRef`.
 *
 * O CHECKLIST.md vive em `deployment-guide/CHECKLIST.md`; os scripts em
 * `deployment-guide/scripts/`. Logo, do ponto de vista do checklist, o
 * script está em `scripts/XX-name.sh`.
 */
export function scriptRefFor(key: BashScriptKey): string {
  return `scripts/${SCRIPT_FILENAMES[key]}`;
}
