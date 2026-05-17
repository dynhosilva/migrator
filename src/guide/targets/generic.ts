import type { GuideTargetProfile } from '../types';

/**
 * Perfil genérico — usado quando o usuário tem um VPS fora dos provedores
 * suportados explicitamente.
 *
 * O conteúdo é neutro (não menciona painel específico). Serve como fallback
 * seguro para qualquer servidor Ubuntu/Debian com acesso SSH.
 */
export const GENERIC_PROFILE: GuideTargetProfile = {
  id: 'generic',
  displayName: 'VPS genérico',
  panelName: 'painel do seu provedor',
  defaultUser: 'root',
  defaultRemotePath: '/opt/app',
  defaultOs: 'Ubuntu 22.04 LTS ou Debian 12',
  recommendedPlan: '2 vCPU, 4 GB RAM, 40 GB SSD',
  panelInstructions: [
    'Acesse o painel de controle do seu provedor de VPS.',
    'Localize o servidor e anote o IP público.',
    'Confirme que o sistema operacional é Ubuntu 22.04 LTS ou Debian 12. Outras distros funcionam, mas os scripts deste guia são testados nessas.',
  ],
  sshInstructions: [
    'Abra um terminal (Terminal no macOS/Linux, PowerShell ou Windows Terminal no Windows).',
    'Conecte ao servidor: `ssh root@SEU_IP_AQUI` (substitua SEU_IP_AQUI pelo IP do servidor).',
    'Na primeira conexão, digite "yes" para aceitar a fingerprint.',
    'Use a senha root fornecida pelo seu provedor ou a chave SSH que você cadastrou.',
  ],
  notes: [
    'Verifique se as portas 22 (SSH), 80 (HTTP) e 443 (HTTPS) estão liberadas no firewall do seu provedor.',
    'Para apontar um domínio, configure um registro A no DNS do domínio apontando para o IP do servidor.',
  ],
} as const;
