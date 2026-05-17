import type { GuideTargetProfile } from '../types';

/**
 * Perfil Hostinger VPS — provedor prioritário do guide v1.
 *
 * Os textos refletem o painel atual (hPanel) e os planos KVM. Todos os campos
 * são strings em PT-BR voltadas ao usuário final — não há lógica de domínio
 * acoplada a este perfil; apenas conteúdo.
 */
export const HOSTINGER_PROFILE: GuideTargetProfile = {
  id: 'hostinger',
  displayName: 'Hostinger VPS',
  panelName: 'hPanel',
  defaultUser: 'root',
  defaultRemotePath: '/opt/app',
  defaultOs: 'Ubuntu 22.04 LTS',
  recommendedPlan: 'KVM 2 (2 vCPU, 8 GB RAM, 100 GB NVMe)',
  panelInstructions: [
    'Acesse https://hpanel.hostinger.com e faça login.',
    'No menu lateral, clique em "VPS" e selecione o seu servidor.',
    'Na aba "Visão geral", anote o IP público do servidor — você vai precisar dele.',
    'Na aba "Sistema operacional", confirme que está rodando Ubuntu 22.04 LTS. Se não estiver, use "Reinstalar SO" e escolha Ubuntu 22.04.',
  ],
  sshInstructions: [
    'Opção A (mais fácil, dentro do navegador): no hPanel, abra seu VPS e clique em "Terminal de navegador". Uma janela preta abre — esse é o terminal SSH.',
    'Opção B (terminal local): abra o Terminal (macOS/Linux) ou PowerShell (Windows) e rode: `ssh root@SEU_IP_AQUI`. Substitua SEU_IP_AQUI pelo IP da Hostinger.',
    'Na primeira conexão, digite "yes" para confirmar a fingerprint do servidor.',
    'A senha root é definida no hPanel em "Acesso SSH". Se não lembrar, redefina por lá.',
  ],
  notes: [
    'A Hostinger já abre as portas 22 (SSH), 80 (HTTP) e 443 (HTTPS) por padrão — não precisa configurar firewall externo.',
    'Para apontar um domínio, configure os registros DNS no painel onde o domínio foi comprado (Hostinger Domains, Registro.br, GoDaddy, etc.) — adicione um registro A apontando para o IP do VPS.',
    'O suporte da Hostinger via chat 24/7 ajuda com problemas de rede e SO — não com a configuração da sua aplicação.',
  ],
} as const;
