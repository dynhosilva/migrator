import path from 'path';
import type { ProjectContext } from '../core/types';
import type { GuideState, GuideOptions, GuideConfig, GeneratedFile } from './types';
import { GuideRegistry }       from './registry';
import { resolveTargetProfile } from './targets';
import { generateDeployDoc }   from './tasks/deploy-doc-generator';
import { generateChecklist }   from './tasks/checklist-generator';
import { generateScripts }     from './tasks/script-generator';
import { writeGeneratedFiles } from '../migrator/writer';
import { withGuide }           from '../core';
import { logger }              from '../logger';

// ─── Defaults ─────────────────────────────────────────────────────────────────

const DEFAULT_TARGET = 'hostinger' as const;
const DEFAULT_PORT_FALLBACK = 3000;
const DIFFICULTY_LEVEL: GuideState['difficultyLevel'] = 'beginner';

// ─── Registry ─────────────────────────────────────────────────────────────────

/**
 * Registry da fase guide.
 *
 * Ordem de registro:
 *  - deployDoc: artefato narrativo — explica o "como" e "por quê" de cada passo
 *  - checklist: artefato operacional verificável — guia execução com checkboxes
 *  - scripts:   scripts bash contextuais (`01-setup-vps.sh` ... `06-health-check.sh`)
 *
 * As três tasks são independentes — nenhuma depende de `partial.X!` de outra.
 * Cada uma lê do mesmo `ctx + config`, o que garante consistência de conteúdo
 * entre os artefatos sem acoplamento de execução. A referência cruzada entre
 * checklist (scriptRef) e scripts é feita via constantes estáticas em
 * `tasks/script-generator.ts` (SCRIPT_FILENAMES), não pelo `partial`.
 *
 * Tasks futuras (Fase 2): configs Nginx dedicados, troubleshooting estendido.
 * Cada uma vive em seu próprio arquivo em `tasks/`.
 */
const registry = new GuideRegistry()
  .register({
    key: 'deployDoc',
    run: ({ ctx, config }) => generateDeployDoc(ctx, config),
  })
  .register({
    key: 'checklist',
    run: ({ ctx, config }) => generateChecklist(ctx, config),
  })
  .register({
    key: 'scripts',
    run: ({ ctx, config }) => generateScripts(ctx, config),
  });

// ─── Resolução de config ──────────────────────────────────────────────────────

/**
 * Resolve as opções do usuário em uma config completa.
 *
 * - Aplica defaults sensatos (target = hostinger).
 * - Extrai a porta do deploy quando disponível.
 * - Normaliza o domínio (remove protocolo e trailing slash).
 * - Retorna objeto totalmente preenchido para o registry consumir.
 */
function resolveGuideConfig(
  ctx: ProjectContext,
  options: GuideOptions,
): GuideConfig {
  const target = options.target ?? DEFAULT_TARGET;
  const profile = resolveTargetProfile(target);

  const port = options.port
    ?? ctx.deploy?.docker.exposedPort
    ?? DEFAULT_PORT_FALLBACK;

  return {
    target,
    profile,
    domain:     normalizeDomain(options.domain),
    port,
    remotePath: options.remotePath ?? profile.defaultRemotePath,
    adminEmail: normalizeAdminEmail(options.adminEmail),
  };
}

// Regex pragmático: rótulos alfanuméricos (com hífen interno) separados por ponto,
// pelo menos 2 segmentos. Não cobre IDN (Unicode) — quando aparecer demanda,
// adicione idn-uts46 e converta antes de validar.
const DOMAIN_RE = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/i;

// Validação de email "razoável" — não tenta cobrir RFC 5322 completo.
// O Certbot rejeita emails malformados no provisionamento; vale falhar cedo aqui.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Normaliza e valida o domínio fornecido pelo usuário.
 *
 * Aceita: "meuapp.com", "https://meuapp.com", "meuapp.com/", "  meuapp.com  ".
 * Rejeita: domínios com formato inválido, com "www." no início (porque o guide
 * já configura `www` automaticamente — passar "www.meuapp.com" causa duplicação).
 *
 * Retorna `null` quando o usuário não forneceu nada (caminho normal).
 */
function normalizeDomain(raw: string | undefined): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (trimmed === '') return null;

  const cleaned = trimmed
    .replace(/^https?:\/\//, '')
    .replace(/\/+$/, '');

  if (cleaned.toLowerCase().startsWith('www.')) {
    throw new Error(
      `Domínio inválido: "${raw}". Use o domínio raiz, sem "www." — o guide ` +
      `configura "www.${cleaned.slice(4)}" automaticamente. Ex: --domain ${cleaned.slice(4)}`,
    );
  }

  if (!DOMAIN_RE.test(cleaned)) {
    throw new Error(
      `Domínio inválido: "${raw}". Use o formato "meuapp.com" — letras, números, ` +
      `hífens e pontos. Sem espaços, sem caracteres acentuados, sem barras.`,
    );
  }

  return cleaned;
}

/**
 * Normaliza e valida o email administrativo (usado pelo Certbot/Let's Encrypt).
 *
 * Retorna `null` quando o usuário não forneceu nada. Falha cedo com mensagem
 * útil se o formato estiver claramente errado — Certbot quebra em runtime
 * com mensagem críptica se aceitar um email inválido.
 */
function normalizeAdminEmail(raw: string | undefined): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (trimmed === '') return null;

  if (!EMAIL_RE.test(trimmed)) {
    throw new Error(
      `Email inválido: "${raw}". Use o formato "voce@exemplo.com". ` +
      `O Certbot usa esse email para avisos de expiração de certificado SSL.`,
    );
  }

  return trimmed;
}

// ─── Coletor de arquivos ──────────────────────────────────────────────────────

function collectAllFiles(partial: Partial<GuideState>): GeneratedFile[] {
  return [
    ...(partial.deployDoc?.files ?? []),
    ...(partial.checklist?.files ?? []),
    ...(partial.scripts?.files   ?? []),
    // Fases futuras adicionarão aqui: nginx, troubleshoot estendido
  ];
}

// ─── Entry points públicos ────────────────────────────────────────────────────

/**
 * Gera o pacote de deploy assistido para um projeto.
 *
 * Limites de segurança (Fase 1):
 *   - Nunca abre conexão SSH
 *   - Nunca executa comandos no servidor remoto
 *   - Nunca modifica arquivos do projeto original
 *   - Toda escrita é restrita ao outputDir
 *
 * Pré-condições:
 *   - ctx.analysis preenchido (rodar analyzeContext antes)
 *   - ctx.plan preenchido (rodar planContext antes)
 *
 * Pré-condições opcionais (melhoram a saída):
 *   - ctx.deploy preenchido — usa a porta exposta do Dockerfile
 *
 * @param ctx       ProjectContext com analysis e plan preenchidos
 * @param outputDir Diretório de saída (artefatos vão para outputDir/deployment-guide/)
 * @param options   Opções do usuário (target, domain, port, etc.)
 */
export function guideProject(
  ctx: ProjectContext,
  outputDir: string,
  options: GuideOptions = {},
): GuideState {
  if (!ctx.analysis) {
    throw new Error('guideProject requer análise prévia — execute analyzeContext antes.');
  }
  if (!ctx.plan) {
    throw new Error('guideProject requer planejamento prévio — execute planContext antes.');
  }

  const config = resolveGuideConfig(ctx, options);
  const resolvedOutputDir = path.resolve(outputDir);

  logger.info(`Gerando guia de deploy assistido (${config.profile.displayName}) em: ${resolvedOutputDir}/deployment-guide`);

  const partial = registry.run(ctx, resolvedOutputDir, config);
  const files   = collectAllFiles(partial);

  writeGeneratedFiles(resolvedOutputDir, files);

  logger.info(`${files.length} ${files.length === 1 ? 'arquivo gerado' : 'arquivos gerados'} em deployment-guide/.`);

  const deployDocMinutes = partial.deployDoc?.estimatedMinutes ?? 0;
  const checklistMinutes = partial.checklist?.estimatedMinutes ?? 0;
  // Tempo total = checklist (já agrega todas as fases operacionais).
  // deployDoc.estimatedMinutes é tempo de leitura.
  // scripts.estimatedMinutes é tempo de execução dos scripts — já está incluído
  // no checklist (cada item tem `estimatedMinutes` e o checklist soma todos).
  // Logo, ficamos com o maior dos dois para não dupla-contar.
  const totalMinutes = Math.max(deployDocMinutes, checklistMinutes);

  return {
    projectName:           ctx.analysis.projectName,
    outputDir:             resolvedOutputDir,
    target:                config.target,
    domain:                config.domain,
    port:                  config.port,
    remotePath:            config.remotePath,
    deployDoc:             partial.deployDoc!,
    checklist:             partial.checklist!,
    scripts:               partial.scripts!,
    difficultyLevel:       DIFFICULTY_LEVEL,
    estimatedTotalMinutes: totalMinutes,
    generatedAt:           new Date().toISOString(),
  };
}

/**
 * Fase guide do pipeline: enriquece o ProjectContext com GuideState.
 *
 * Pode ser chamada após qualquer fase posterior ao plan — não depende
 * de migrate/deploy estarem preenchidos (mas se estiverem, usa a porta).
 */
export function guideContext(
  ctx: ProjectContext,
  outputDir: string,
  options: GuideOptions = {},
): ProjectContext {
  const state = guideProject(ctx, outputDir, options);
  return withGuide(ctx, state);
}

// ─── Re-exports ───────────────────────────────────────────────────────────────

export { resolveTargetProfile, listAvailableTargets, HOSTINGER_PROFILE, GENERIC_PROFILE } from './targets';

export type {
  GuideState,
  GuideOptions,
  GuideConfig,
  GuideTarget,
  GuideTargetProfile,
  DeployDocArtifact,
  ChecklistArtifact,
  ChecklistSection,
  ChecklistItem,
  ChecklistPhase,
  ChecklistDifficulty,
  BashScriptsArtifact,
  BashScriptFile,
  BashScriptKey,
  BashScriptExecutionLocation,
  GeneratedFile,
} from './types';

