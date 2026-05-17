import type { GeneratedFile } from '../migrator/types';

export type { GeneratedFile };

// ─── Target do guia (provedor de VPS) ─────────────────────────────────────────

/**
 * Provedor de hospedagem para o qual o guia é gerado.
 *
 * Cada target define textos contextuais, paths padrão, instruções específicas
 * de painel de controle e nuances do provedor. O target nunca muda o pipeline —
 * apenas o conteúdo dos artefatos gerados.
 *
 * `generic` produz instruções neutras, sem mencionar painel ou provedor.
 */
export type GuideTarget = 'hostinger' | 'digitalocean' | 'aws-lightsail' | 'generic';

/**
 * Perfil do provedor de hospedagem.
 *
 * Estes campos alimentam o gerador de documentação — não impactam comportamento
 * funcional. São strings localizadas em português, voltadas ao usuário final.
 */
export interface GuideTargetProfile {
  readonly id: GuideTarget;
  readonly displayName: string;             // "Hostinger VPS", "DigitalOcean Droplet"
  readonly panelName: string;               // "hPanel", "DigitalOcean Console", "Lightsail Console"
  readonly defaultUser: string;             // usuário SSH padrão sugerido pelo provedor
  readonly defaultRemotePath: string;       // path remoto onde os arquivos vão (/opt/app, /root/app)
  readonly defaultOs: string;               // SO recomendado (ex: "Ubuntu 22.04 LTS")
  readonly recommendedPlan: string;         // plano mínimo sugerido (ex: "KVM 2")
  readonly panelInstructions: readonly string[]; // passos no painel do provedor
  readonly sshInstructions: readonly string[];   // como abrir terminal SSH no provedor
  readonly notes: readonly string[];        // observações específicas (firewall padrão, DNS, etc.)
}

// ─── Opções do usuário ────────────────────────────────────────────────────────

/**
 * Configurações fornecidas pelo usuário ao gerar o guia.
 *
 * Todas opcionais — defaults sensatos são aplicados pelo `resolveGuideConfig`.
 * Pensado para iniciantes: o mínimo necessário é `target`.
 */
export interface GuideOptions {
  readonly target?: GuideTarget;
  readonly domain?: string;                 // ex: "meuapp.com" (sem protocolo)
  readonly port?: number;                   // porta de runtime da app (padrão: vem do deploy)
  readonly remotePath?: string;             // override do default do target
  readonly adminEmail?: string;             // usado em Certbot / Let's Encrypt (Fase 2)
}

/**
 * Configuração resolvida internamente — todos os campos preenchidos.
 *
 * Construída por `resolveGuideConfig` antes da execução do registry.
 * Tasks consomem `GuideConfig`, nunca `GuideOptions` cru.
 */
export interface GuideConfig {
  readonly target: GuideTarget;
  readonly profile: GuideTargetProfile;
  readonly domain: string | null;           // null quando o usuário ainda não tem domínio
  readonly port: number;                    // resolvido do deploy.docker.exposedPort
  readonly remotePath: string;
  readonly adminEmail: string | null;
}

// ─── Artefatos gerados pelo guide v1 (Fase 1) ─────────────────────────────────

/**
 * Artefato narrativo principal — o "DEPLOY.md".
 *
 * É o único artefato gerado na Fase 1 do módulo. Fases futuras adicionarão:
 *  - CHECKLIST.md          (checklist verificável)
 *  - scripts/*.sh          (bash gerado por contexto)
 *  - config/nginx-*.conf   (Nginx contextual)
 *  - troubleshooting/*.md  (erros comuns)
 *
 * Cada artefato vive em seu próprio campo do GuideState. Tasks são independentes.
 */
export interface DeployDocArtifact {
  readonly files: GeneratedFile[];
  readonly stepCount: number;               // número de seções/passos numerados
  readonly estimatedMinutes: number;        // tempo estimado de leitura+execução
}

// ─── Artefato CHECKLIST.md ────────────────────────────────────────────────────

/**
 * Fase operacional do checklist. Cada fase agrupa itens relacionados.
 *
 * A ordem aqui não é apenas semântica — é a ordem em que o usuário deve
 * executar as etapas. O gerador renderiza as seções na ordem do array
 * passado ao `generateChecklist`.
 */
export type ChecklistPhase =
  | 'pre-deploy'
  | 'vps-setup'
  | 'docker-install'
  | 'upload'
  | 'env'
  | 'deploy'
  | 'domain'
  | 'ssl'
  | 'post-deploy'
  | 'troubleshooting';

/** Dificuldade percebida pelo usuário iniciante. */
export type ChecklistDifficulty = 'easy' | 'medium' | 'hard';

/**
 * Item individual do checklist.
 *
 * `id` é estável (não muda entre regenerações) para futura persistência
 * de estado em uma TUI interativa ("já marquei esse item").
 *
 * `warning` aparece como callout abaixo do item.
 * `scriptRef` aponta para um script bash futuro (Fase 1.x) — null hoje.
 */
export interface ChecklistItem {
  readonly id: string;
  readonly label: string;
  readonly required: boolean;
  readonly warning?: string;
  readonly scriptRef?: string;
  readonly estimatedMinutes?: number;
  readonly difficulty?: ChecklistDifficulty;
}

/**
 * Agrupamento de itens por fase.
 *
 * Cada seção é construída por uma função pura `buildXSection(ctx, config)`.
 * Permite renderização visual consistente (mesmo ícone, mesma estrutura)
 * e contagem de progresso por seção.
 */
export interface ChecklistSection {
  readonly id: ChecklistPhase;
  readonly title: string;
  readonly icon: string;
  readonly summary: string;
  readonly estimatedMinutes: number;
  readonly items: ChecklistItem[];
}

export interface ChecklistArtifact {
  readonly files: GeneratedFile[];
  readonly sections: ChecklistSection[];
  readonly totalItems: number;
  readonly requiredItems: number;
  readonly estimatedMinutes: number;
}

// ─── Estado de topo do módulo guide ───────────────────────────────────────────

/**
 * Resultado completo da fase de guide.
 *
 * Cada campo é preenchido por uma task independente via GuideRegistry.
 * Fases futuras adicionarão campos (checklist, scripts, nginx, troubleshoot)
 * sem quebrar o contrato atual — `?` permite extensão progressiva.
 */
export interface GuideState {
  readonly projectName: string;
  readonly outputDir: string;
  readonly target: GuideTarget;
  readonly domain: string | null;
  readonly port: number;
  readonly remotePath: string;
  readonly deployDoc: DeployDocArtifact;
  readonly checklist: ChecklistArtifact;
  readonly difficultyLevel: 'beginner' | 'intermediate';
  readonly estimatedTotalMinutes: number;   // soma das estimativas de todos os artefatos
  readonly generatedAt: string;
}
