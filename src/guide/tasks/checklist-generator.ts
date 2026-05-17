import type { ProjectContext } from '../../core/types';
import type {
  GuideConfig,
  ChecklistArtifact,
  ChecklistSection,
  ChecklistItem,
  GeneratedFile,
} from '../types';
import { scriptRefFor } from '../constants';

// ─── Constantes de apresentação ───────────────────────────────────────────────

const SECTION_ICON: Record<ChecklistSection['id'], string> = {
  'pre-deploy':      '🧰',
  'vps-setup':       '🖥',
  'docker-install':  '🐳',
  'upload':          '📦',
  'env':             '🔐',
  'deploy':          '🚀',
  'domain':          '🌐',
  'ssl':             '🔒',
  'post-deploy':     '✅',
  'troubleshooting': '🆘',
};

// ─── Helpers de construção de item ────────────────────────────────────────────

/**
 * Construtor curto e tipado para itens do checklist.
 *
 * Centraliza o shape do item para que as funções `buildXSection()` fiquem
 * legíveis — sem repetir `required: true` em cada linha.
 */
function item(
  id: string,
  label: string,
  extras: Partial<Omit<ChecklistItem, 'id' | 'label'>> = {},
): ChecklistItem {
  return {
    id,
    label,
    required: extras.required ?? true,
    ...(extras.warning          !== undefined ? { warning:          extras.warning }          : {}),
    ...(extras.scriptRef        !== undefined ? { scriptRef:        extras.scriptRef }        : {}),
    ...(extras.estimatedMinutes !== undefined ? { estimatedMinutes: extras.estimatedMinutes } : {}),
    ...(extras.difficulty       !== undefined ? { difficulty:       extras.difficulty }       : {}),
  };
}

// ─── Helpers de contexto ──────────────────────────────────────────────────────

function detectsSupabase(ctx: ProjectContext): boolean {
  return ctx.analysis?.supabase.detected ?? false;
}

function getEnvVars(ctx: ProjectContext): string[] {
  const required = ctx.plan?.env.required ?? [];
  if (required.length > 0) return required;
  return ctx.analysis?.envVars ?? [];
}

// ─── Seções (funções puras) ───────────────────────────────────────────────────

function buildPreDeploySection(ctx: ProjectContext, config: GuideConfig): ChecklistSection {
  const projectName = ctx.analysis?.projectName ?? ctx.meta.name;
  const hasSupabase = detectsSupabase(ctx);
  const hasDomain = config.domain !== null;

  const items: ChecklistItem[] = [
    item('pre.artifacts',
      `Tenho a pasta \`output/${projectName}/\` gerada pelo lovable-migrate`,
      { estimatedMinutes: 0, difficulty: 'easy' }),
    item('pre.vps',
      `Tenho um VPS ativo (${config.profile.recommendedPlan})`,
      { estimatedMinutes: 0, difficulty: 'easy' }),
    item('pre.ip',
      'Anotei o IP público do servidor',
      {
        estimatedMinutes: 1,
        difficulty: 'easy',
        warning: 'Sem o IP, você não consegue acessar o servidor.',
      }),
    item('pre.domain',
      hasDomain
        ? `Já comprei o domínio \`${config.domain}\``
        : 'Já comprei (ou vou comprar) um domínio para o projeto',
      {
        required: false,
        estimatedMinutes: 0,
        difficulty: 'easy',
      }),
  ];

  if (hasSupabase) {
    items.push(item('pre.supabase-keys',
      'Tenho as chaves do Supabase em mãos (Project Settings → API)',
      {
        estimatedMinutes: 2,
        difficulty: 'easy',
        warning: 'Você vai precisar de `SUPABASE_URL` e `SUPABASE_ANON_KEY` no Passo 5.',
      }));
  }

  return {
    id: 'pre-deploy',
    title: 'Pré-deploy (no seu computador)',
    icon: SECTION_ICON['pre-deploy'],
    summary: 'Reúna tudo que você vai precisar antes de tocar no servidor.',
    estimatedMinutes: 5,
    items,
  };
}

function buildVpsSetupSection(_ctx: ProjectContext, config: GuideConfig): ChecklistSection {
  const profile = config.profile;

  const items: ChecklistItem[] = [
    item('vps.panel',
      `Acessei o painel ${profile.panelName}`,
      { estimatedMinutes: 1, difficulty: 'easy' }),
    item('vps.os',
      `Confirmei que o sistema operacional é ${profile.defaultOs}`,
      {
        estimatedMinutes: 1,
        difficulty: 'easy',
        warning: 'Outras distribuições funcionam, mas os comandos deste guia foram testados nesse SO.',
      }),
    item('vps.ssh',
      'Abri o terminal SSH (terminal de navegador ou ssh local)',
      { estimatedMinutes: 2, difficulty: 'easy' }),
    item('vps.login',
      `Estou logado como \`${profile.defaultUser}\` no servidor`,
      { estimatedMinutes: 1, difficulty: 'easy' }),
  ];

  return {
    id: 'vps-setup',
    title: `Setup do ${profile.displayName}`,
    icon: SECTION_ICON['vps-setup'],
    summary: 'Acesse o servidor e confirme que está pronto para receber a aplicação.',
    estimatedMinutes: 5,
    items,
  };
}

function buildDockerInstallSection(_ctx: ProjectContext, _config: GuideConfig): ChecklistSection {
  const items: ChecklistItem[] = [
    item('docker.update',
      'Atualizei o sistema (`apt-get update && apt-get upgrade -y`)',
      { estimatedMinutes: 2, difficulty: 'easy', scriptRef: scriptRefFor('setup-vps') }),
    item('docker.install',
      'Instalei o Docker (`curl -fsSL https://get.docker.com | sh`)',
      { estimatedMinutes: 2, difficulty: 'easy', scriptRef: scriptRefFor('install-docker') }),
    item('docker.compose',
      'Instalei o plugin Compose (`apt-get install -y docker-compose-plugin`)',
      { estimatedMinutes: 1, difficulty: 'easy', scriptRef: scriptRefFor('install-docker') }),
    item('docker.verify',
      'Validei: `docker --version` e `docker compose version` retornam versões',
      {
        estimatedMinutes: 1,
        difficulty: 'easy',
        warning: 'Se algum comando retornar "not found", repita a instalação anterior.',
        scriptRef: scriptRefFor('install-docker'),
      }),
  ];

  return {
    id: 'docker-install',
    title: 'Instalação do Docker',
    icon: SECTION_ICON['docker-install'],
    summary: 'Instale o Docker e o Compose no servidor — é o que vai rodar sua aplicação.',
    estimatedMinutes: 6,
    items,
  };
}

function buildUploadSection(ctx: ProjectContext, config: GuideConfig): ChecklistSection {
  const projectName = ctx.analysis?.projectName ?? ctx.meta.name;
  const user = config.profile.defaultUser;

  const items: ChecklistItem[] = [
    item('upload.mkdir',
      `Criei \`${config.remotePath}\` no servidor`,
      { estimatedMinutes: 1, difficulty: 'easy' }),
    item('upload.scp',
      `Enviei os arquivos: \`scp -r docker/ .env ${user}@SEU_IP:${config.remotePath}/\``,
      {
        estimatedMinutes: 3,
        difficulty: 'medium',
        warning: 'Rode esse comando no terminal do **seu computador**, não no terminal SSH do servidor.',
        scriptRef: scriptRefFor('upload'),
      }),
    item('upload.verify',
      `Confirmei no servidor: \`ls ${config.remotePath}/docker\` mostra os arquivos`,
      { estimatedMinutes: 1, difficulty: 'easy' }),
  ];

  return {
    id: 'upload',
    title: `Upload para ${config.profile.displayName}`,
    icon: SECTION_ICON['upload'],
    summary: `Transfira os artefatos gerados em \`output/${projectName}/\` para o servidor.`,
    estimatedMinutes: 5,
    items,
  };
}

function buildEnvSection(ctx: ProjectContext, config: GuideConfig): ChecklistSection {
  const envVars = getEnvVars(ctx);
  const hasSupabase = detectsSupabase(ctx);

  const items: ChecklistItem[] = [
    item('env.create',
      `Criei o arquivo \`.env\` em \`${config.remotePath}\` (no servidor)`,
      { estimatedMinutes: 1, difficulty: 'easy' }),
  ];

  for (const name of envVars) {
    items.push(item(
      `env.var.${name}`,
      `Preenchi \`${name}=...\``,
      {
        estimatedMinutes: 1,
        difficulty: 'easy',
      },
    ));
  }

  items.push(item('env.save',
    'Salvei o arquivo (`Ctrl+X`, `Y`, `Enter` no nano)',
    {
      estimatedMinutes: 1,
      difficulty: 'easy',
      warning: 'Esse arquivo contém segredos — nunca compartilhe em público.',
    }));

  const summary = envVars.length === 0
    ? 'Nenhuma variável de ambiente foi detectada no projeto — pule essa seção se confirmar que está correto.'
    : hasSupabase
      ? `Configure as ${envVars.length} variável(is) detectadas. Os valores Supabase estão em Project Settings → API.`
      : `Configure as ${envVars.length} variável(is) detectadas no projeto.`;

  return {
    id: 'env',
    title: 'Variáveis de ambiente',
    icon: SECTION_ICON['env'],
    summary,
    estimatedMinutes: Math.max(3, envVars.length + 2),
    items,
  };
}

function buildDeploySection(_ctx: ProjectContext, config: GuideConfig): ChecklistSection {
  const port = config.port;

  const items: ChecklistItem[] = [
    item('deploy.build',
      `Rodei \`docker compose up -d --build\` em \`${config.remotePath}/docker\``,
      {
        estimatedMinutes: 4,
        difficulty: 'medium',
        warning: 'A primeira execução demora — está baixando a imagem base e construindo a sua.',
        scriptRef: scriptRefFor('deploy'),
      }),
    item('deploy.status',
      'Verifiquei `docker compose ps` — container com status `running`',
      { estimatedMinutes: 1, difficulty: 'easy' }),
    item('deploy.test',
      `Acessei \`http://SEU_IP:${port}\` no navegador — a aplicação carregou`,
      {
        estimatedMinutes: 1,
        difficulty: 'easy',
        warning: 'Não abriu? Rode `docker compose logs --tail=100` e veja a seção Troubleshooting.',
      }),
  ];

  return {
    id: 'deploy',
    title: 'Deploy da aplicação',
    icon: SECTION_ICON['deploy'],
    summary: 'Suba os containers e confirme que a aplicação responde no IP do servidor.',
    estimatedMinutes: 6,
    items,
  };
}

function buildDomainSection(_ctx: ProjectContext, config: GuideConfig): ChecklistSection {
  const domain = config.domain;
  const hasDomain = domain !== null;
  const exemplo = domain ?? 'meuapp.com';

  if (!hasDomain) {
    const items: ChecklistItem[] = [
      item('domain.skip',
        'Pulei essa seção — vou configurar o domínio depois',
        {
          required: false,
          estimatedMinutes: 0,
          difficulty: 'easy',
          warning: 'Sem domínio, a aplicação fica acessível apenas pelo IP — e sem HTTPS.',
        }),
    ];
    return {
      id: 'domain',
      title: 'Configuração de domínio (DNS)',
      icon: SECTION_ICON['domain'],
      summary: 'Você não passou `--domain` ao gerar o guia. Quando tiver um domínio, regenere com `--domain meuapp.com`.',
      estimatedMinutes: 0,
      items,
    };
  }

  const items: ChecklistItem[] = [
    item('domain.dns-a-root',
      `Adicionei registro A: \`@ → SEU_IP\` (apontando \`${exemplo}\`)`,
      { estimatedMinutes: 2, difficulty: 'medium' }),
    item('domain.dns-a-www',
      `Adicionei registro A: \`www → SEU_IP\` (apontando \`www.${exemplo}\`)`,
      { estimatedMinutes: 1, difficulty: 'medium' }),
    item('domain.propagated',
      `\`ping ${exemplo}\` no meu computador retorna o IP do servidor`,
      {
        estimatedMinutes: 10,
        difficulty: 'medium',
        warning: 'A propagação DNS leva de 5 minutos a 24 horas. Não passe para o SSL antes disso.',
      }),
  ];

  return {
    id: 'domain',
    title: 'Configuração de domínio (DNS)',
    icon: SECTION_ICON['domain'],
    summary: `Aponte \`${exemplo}\` para o IP do servidor — necessário antes do SSL.`,
    estimatedMinutes: 13,
    items,
  };
}

function buildSslSection(_ctx: ProjectContext, config: GuideConfig): ChecklistSection {
  const domain = config.domain;
  const hasDomain = domain !== null;
  const exemplo = domain ?? 'meuapp.com';

  if (!hasDomain) {
    const items: ChecklistItem[] = [
      item('ssl.skip',
        'Pulei essa seção — SSL exige um domínio configurado',
        {
          required: false,
          estimatedMinutes: 0,
          difficulty: 'easy',
        }),
    ];
    return {
      id: 'ssl',
      title: 'HTTPS (SSL)',
      icon: SECTION_ICON['ssl'],
      summary: 'SSL gratuito (Let\'s Encrypt) exige um domínio apontando para o servidor. Volte aqui quando tiver um.',
      estimatedMinutes: 0,
      items,
    };
  }

  const port = config.port;

  const items: ChecklistItem[] = [
    item('ssl.nginx-install',
      'Instalei o Nginx (`apt-get install -y nginx`)',
      { estimatedMinutes: 1, difficulty: 'easy', scriptRef: scriptRefFor('ssl') }),
    item('ssl.nginx-config',
      `Criei \`/etc/nginx/sites-available/${exemplo}\` com proxy_pass para porta ${port}`,
      { estimatedMinutes: 3, difficulty: 'medium', scriptRef: scriptRefFor('ssl') }),
    item('ssl.nginx-enable',
      'Ativei: `ln -s ... && nginx -t && systemctl reload nginx`',
      {
        estimatedMinutes: 1,
        difficulty: 'medium',
        warning: '`nginx -t` precisa retornar `syntax is ok`. Se não retornar, revise o arquivo.',
        scriptRef: scriptRefFor('ssl'),
      }),
    item('ssl.certbot-install',
      'Instalei o Certbot (`apt-get install -y certbot python3-certbot-nginx`)',
      { estimatedMinutes: 1, difficulty: 'easy', scriptRef: scriptRefFor('ssl') }),
    item('ssl.certbot-run',
      `Gerei o certificado (\`certbot --nginx -d ${exemplo} -d www.${exemplo}\`)`,
      {
        estimatedMinutes: 2,
        difficulty: 'medium',
        warning: 'O DNS precisa já ter propagado. Se falhar com erro de DNS, volte ao passo anterior.',
        scriptRef: scriptRefFor('ssl'),
      }),
  ];

  return {
    id: 'ssl',
    title: 'HTTPS (SSL gratuito com Let\'s Encrypt)',
    icon: SECTION_ICON['ssl'],
    summary: `Adicione o cadeado verde a \`https://${exemplo}\` — renova sozinho a cada 90 dias.`,
    estimatedMinutes: 8,
    items,
  };
}

function buildPostDeploySection(_ctx: ProjectContext, config: GuideConfig): ChecklistSection {
  const hasDomain = config.domain !== null;
  const accessUrl = hasDomain ? `https://${config.domain}` : `http://SEU_IP:${config.port}`;

  const items: ChecklistItem[] = [
    item('post.access',
      `Acessei \`${accessUrl}\` ${hasDomain ? 'com cadeado verde' : ''}`,
      { estimatedMinutes: 1, difficulty: 'easy', scriptRef: scriptRefFor('health-check') }),
    item('post.flow',
      'Testei o fluxo principal da aplicação (login, navegação, ações críticas)',
      {
        estimatedMinutes: 5,
        difficulty: 'easy',
        warning: 'Se você usa Supabase, teste explicitamente o login e uma operação de leitura/escrita.',
      }),
    item('post.logs',
      'Inspecionei `docker compose logs --tail=200` em busca de erros',
      { estimatedMinutes: 2, difficulty: 'easy', scriptRef: scriptRefFor('health-check') }),
  ];

  return {
    id: 'post-deploy',
    title: 'Pós-deploy',
    icon: SECTION_ICON['post-deploy'],
    summary: 'Confirme que a aplicação está no ar e funcionando ponta a ponta.',
    estimatedMinutes: 5,
    items,
  };
}

function buildTroubleshootingSection(_ctx: ProjectContext, _config: GuideConfig): ChecklistSection {
  const items: ChecklistItem[] = [
    item('trouble.logs',
      'Sei ver os logs: `docker compose logs --tail=200`',
      { required: false, estimatedMinutes: 1, difficulty: 'easy' }),
    item('trouble.restart',
      'Sei reiniciar a aplicação: `docker compose restart`',
      { required: false, estimatedMinutes: 1, difficulty: 'easy' }),
    item('trouble.update',
      'Sei atualizar: novo `scp` dos arquivos + `docker compose up -d --build`',
      { required: false, estimatedMinutes: 2, difficulty: 'medium' }),
    item('trouble.docs',
      'Sei onde está o `DEPLOY.md` (mesmo diretório deste arquivo) para consulta detalhada',
      { required: false, estimatedMinutes: 0, difficulty: 'easy' }),
  ];

  return {
    id: 'troubleshooting',
    title: 'Domino o operacional',
    icon: SECTION_ICON['troubleshooting'],
    summary: 'Garanta que você sabe operar a aplicação no dia a dia — logs, restart, updates.',
    estimatedMinutes: 0,
    items,
  };
}

// ─── Renderização para Markdown ───────────────────────────────────────────────

function renderItem(itemEntry: ChecklistItem): string {
  const lines: string[] = [];
  const requiredMark = itemEntry.required ? '' : ' _(opcional)_';
  lines.push(`- [ ] ${itemEntry.label}${requiredMark}`);

  const meta: string[] = [];
  if (itemEntry.estimatedMinutes !== undefined && itemEntry.estimatedMinutes > 0) {
    meta.push(`⏱ ${itemEntry.estimatedMinutes} min`);
  }
  if (itemEntry.difficulty) {
    const label: Record<'easy' | 'medium' | 'hard', string> = {
      easy: 'fácil',
      medium: 'médio',
      hard: 'avançado',
    };
    meta.push(`📊 ${label[itemEntry.difficulty]}`);
  }
  if (itemEntry.scriptRef) {
    meta.push(`📜 \`${itemEntry.scriptRef}\``);
  }
  if (meta.length > 0) {
    lines.push(`      ${meta.join(' · ')}`);
  }

  if (itemEntry.warning) {
    lines.push(`      > ⚠️ ${itemEntry.warning}`);
  }

  return lines.join('\n');
}

function renderSection(section: ChecklistSection): string {
  const lines: string[] = [];
  const timeNote = section.estimatedMinutes > 0
    ? ` — ~${section.estimatedMinutes} min`
    : '';
  lines.push(`## ${section.icon} ${section.title}${timeNote}`);
  lines.push('');
  lines.push(`_${section.summary}_`);
  lines.push('');
  for (const i of section.items) {
    lines.push(renderItem(i));
    lines.push('');
  }
  return lines.join('\n');
}

function renderProgressTable(sections: ChecklistSection[]): string {
  const lines: string[] = [];
  lines.push('| Fase | Itens | Tempo estimado |');
  lines.push('|---|---|---|');
  for (const s of sections) {
    const time = s.estimatedMinutes > 0 ? `~${s.estimatedMinutes} min` : '—';
    lines.push(`| ${s.icon} ${s.title} | ${s.items.length} | ${time} |`);
  }
  return lines.join('\n');
}

function renderHeader(
  ctx: ProjectContext,
  config: GuideConfig,
  totals: { items: number; required: number; minutes: number },
): string {
  const projectName = ctx.analysis?.projectName ?? ctx.meta.name;
  const domain = config.domain ?? '(não configurado)';

  return [
    `# Checklist de Deploy — ${projectName}`,
    '',
    `Marque cada item conforme conclui. O \`DEPLOY.md\` neste mesmo diretório explica o **como** de cada comando.`,
    '',
    '| Campo | Valor |',
    '|---|---|',
    `| Projeto | \`${projectName}\` |`,
    `| Provedor | ${config.profile.displayName} |`,
    `| Domínio | \`${domain}\` |`,
    `| Porta da aplicação | \`${config.port}\` |`,
    `| Itens totais | ${totals.items} (${totals.required} obrigatórios) |`,
    `| Tempo estimado | ~${totals.minutes} min |`,
    '',
    '> ℹ️ **Como usar este checklist**  ',
    '> Faça uma fase de cada vez, marcando os itens. Cada item tem o **tempo estimado** ao lado. Se algo der errado, consulte a seção **Troubleshooting rápido** no final ou abra o `DEPLOY.md`.',
    '',
  ].join('\n');
}

function renderFooter(generatedAt: string): string {
  return [
    '---',
    '',
    '_Esse checklist foi gerado automaticamente pelo `lovable-migrate` a partir do contexto do seu projeto. Regenerar: rode novamente com as mesmas (ou novas) flags._',
    '',
    `_Gerado em: ${generatedAt}_`,
    '',
  ].join('\n');
}

// ─── Task pública ─────────────────────────────────────────────────────────────

/**
 * Gera o artefato `deployment-guide/CHECKLIST.md` — checklist operacional em PT-BR.
 *
 * Pré-condições (validadas em `guideProject`):
 *  - `ctx.analysis` preenchido
 *  - `ctx.plan` preenchido
 *
 * O documento é montado a partir de funções puras `buildXSection(ctx, config)`,
 * uma por fase operacional. Para adicionar uma nova fase, basta criar uma função
 * `buildYSection` e incluí-la no array `sections` abaixo — não há lógica
 * acoplada às fases além da ordem de execução.
 */
export function generateChecklist(
  ctx: ProjectContext,
  config: GuideConfig,
): ChecklistArtifact {
  const generatedAt = new Date().toISOString();

  // Ordem operacional — é a sequência que o usuário deve seguir.
  const sections: ChecklistSection[] = [
    buildPreDeploySection(ctx, config),
    buildVpsSetupSection(ctx, config),
    buildDockerInstallSection(ctx, config),
    buildUploadSection(ctx, config),
    buildEnvSection(ctx, config),
    buildDeploySection(ctx, config),
    buildDomainSection(ctx, config),
    buildSslSection(ctx, config),
    buildPostDeploySection(ctx, config),
    buildTroubleshootingSection(ctx, config),
  ];

  const totals = sections.reduce(
    (acc, s) => ({
      items:    acc.items    + s.items.length,
      required: acc.required + s.items.filter((i) => i.required).length,
      minutes:  acc.minutes  + s.estimatedMinutes,
    }),
    { items: 0, required: 0, minutes: 0 },
  );

  const content = [
    renderHeader(ctx, config, totals),
    '## Progresso por fase',
    '',
    renderProgressTable(sections),
    '',
    ...sections.map(renderSection),
    renderFooter(generatedAt),
  ].join('\n');

  const file: GeneratedFile = {
    relativePath: 'deployment-guide/CHECKLIST.md',
    content,
    description: `Checklist operacional verificável (${totals.items} itens, ~${totals.minutes} min)`,
  };

  return {
    files:            [file],
    sections,
    totalItems:       totals.items,
    requiredItems:    totals.required,
    estimatedMinutes: totals.minutes,
  };
}

// ─── Re-exports internos para testes ──────────────────────────────────────────

/**
 * Builders exportados individualmente para permitir testes unitários por seção
 * sem rodar o pipeline inteiro.
 *
 * Não fazem parte da API pública do módulo — consumidores externos devem usar
 * `generateChecklist`.
 */
export const __sectionBuilders = {
  buildPreDeploySection,
  buildVpsSetupSection,
  buildDockerInstallSection,
  buildUploadSection,
  buildEnvSection,
  buildDeploySection,
  buildDomainSection,
  buildSslSection,
  buildPostDeploySection,
  buildTroubleshootingSection,
};
