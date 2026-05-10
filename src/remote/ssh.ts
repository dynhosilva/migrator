import type { SshConfig, RemoteIssue } from './types';

/**
 * Configuração SSH padrão com placeholders.
 *
 * Usada quando o usuário não fornece configuração real.
 * O validator detectará o host placeholder e emitirá um warning.
 */
export const DEFAULT_SSH_CONFIG: SshConfig = {
  host:         'your-server.example.com',
  port:         22,
  user:         'ubuntu',
  keyPath:      '~/.ssh/id_rsa',
  authStrategy: 'key',
};

/** Mescla config parcial do usuário com os defaults SSH. */
export function mergeSshConfig(partial?: Partial<SshConfig>): SshConfig {
  if (!partial) return DEFAULT_SSH_CONFIG;
  return { ...DEFAULT_SSH_CONFIG, ...partial };
}

// Hostname RFC 1123: letras, números e hífens, segmentos separados por ponto
const HOSTNAME_RE = /^(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$|^[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?$/;
const IPV4_RE     = /^(?:\d{1,3}\.){3}\d{1,3}$/;

/**
 * Valida o formato da configuração SSH sem abrir conexão real.
 *
 * O que é validado:
 *   - Host: formato de hostname ou IPv4, não-placeholder
 *   - Porta: 1–65535
 *   - Usuário: não vazio
 *   - keyPath: obrigatório se authStrategy = 'key'
 *
 * O que NÃO é validado:
 *   - Conectividade real
 *   - Existência do arquivo de chave no sistema
 *   - Permissões SSH no servidor
 *   - Fingerprint do host
 */
export function validateSshConfigFormat(config: SshConfig): RemoteIssue[] {
  const issues: RemoteIssue[] = [];

  if (!config.host || config.host === DEFAULT_SSH_CONFIG.host) {
    issues.push({
      code:       'SSH_HOST_NOT_CONFIGURED',
      message:    'Host SSH não configurado — usando placeholder padrão.',
      suggestion: 'Forneça o hostname ou endereço IP real do servidor de destino.',
      severity:   'warning',
    });
  } else if (!HOSTNAME_RE.test(config.host) && !IPV4_RE.test(config.host)) {
    issues.push({
      code:       'SSH_HOST_INVALID',
      message:    `Formato de host SSH inválido: "${config.host}"`,
      suggestion: 'Use um hostname válido (ex: myserver.com) ou endereço IPv4 (ex: 192.168.1.1).',
      severity:   'blocker',
    });
  }

  if (config.port < 1 || config.port > 65535) {
    issues.push({
      code:     'SSH_PORT_INVALID',
      message:  `Porta SSH inválida: ${config.port} — deve estar entre 1 e 65535.`,
      severity: 'blocker',
    });
  }

  if (!config.user || config.user.trim() === '') {
    issues.push({
      code:       'SSH_USER_MISSING',
      message:    'Usuário SSH não especificado.',
      suggestion: 'Especifique o usuário do servidor (ex: ubuntu, root, deploy).',
      severity:   'blocker',
    });
  }

  if (config.authStrategy === 'key' && (!config.keyPath || config.keyPath.trim() === '')) {
    issues.push({
      code:       'SSH_KEY_PATH_MISSING',
      message:    'authStrategy é "key" mas keyPath não foi especificado.',
      suggestion: 'Especifique o caminho para a chave SSH privada (ex: ~/.ssh/id_rsa).',
      severity:   'blocker',
    });
  }

  return issues;
}
