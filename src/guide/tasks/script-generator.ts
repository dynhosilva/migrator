import type { ProjectContext } from '../../core/types';
import type {
  GuideConfig,
  BashScriptsArtifact,
  BashScriptFile,
  BashScriptKey,
  BashScriptExecutionLocation,
  GeneratedFile,
} from '../types';
import { VERSION } from '../../version';

// ─── Constantes ───────────────────────────────────────────────────────────────

/**
 * Diretório (relativo ao outputDir) onde todos os scripts são gerados.
 *
 * Mantido como constante única para que o checklist, o DEPLOY.md, o renderer
 * e o gerador concordem sobre o mesmo caminho. Mudança aqui = mudança automática
 * em todos os consumidores.
 */
export const SCRIPTS_DIR = 'deployment-guide/scripts';

/**
 * Filenames estáveis indexados por chave semântica.
 *
 * Exportado para que o checklist-generator preencha `scriptRef` sem hardcode
 * de strings — qualquer renomeio de arquivo passa por aqui.
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
 * Path relativo (a partir de CHECKLIST.md) usado em `scriptRef`.
 *
 * O CHECKLIST.md vive em `deployment-guide/CHECKLIST.md`; os scripts em
 * `deployment-guide/scripts/`. Logo, do ponto de vista do checklist, o
 * script está em `scripts/XX-name.sh`.
 */
export function scriptRefFor(key: BashScriptKey): string {
  return `scripts/${SCRIPT_FILENAMES[key]}`;
}

// ─── Helpers de renderização ──────────────────────────────────────────────────

/**
 * Cabeçalho padrão (shebang + bloco de comentário documental) de cada script.
 *
 * Todo script segue exatamente o mesmo formato — facilita leitura por iniciantes
 * e cria um padrão visual reconhecível. Os campos vêm da estrutura interna,
 * não do conteúdo livre, então mudanças aqui se propagam para todos.
 */
function header(meta: {
  readonly filename: string;
  readonly title: string;
  readonly purposeLines: readonly string[];
  readonly executionLocation: BashScriptExecutionLocation;
  readonly prerequisites: readonly string[];
  readonly estimatedMinutes: number;
  readonly usage?: readonly string[];
  readonly projectName: string;
  readonly targetDisplayName: string;
}): string {
  const locationLabel = meta.executionLocation === 'local'
    ? 'NO SEU COMPUTADOR (terminal local — não no servidor!)'
    : 'NO SERVIDOR (terminal SSH)';

  const lines: string[] = [
    '#!/usr/bin/env bash',
    '#',
    `# ${meta.filename} — ${meta.title}`,
    `# ${'-'.repeat(78)}`,
  ];

  for (const p of meta.purposeLines) {
    lines.push(`# ${p}`);
  }

  lines.push('#');
  lines.push(`# Onde executar:   ${locationLabel}`);

  if (meta.prerequisites.length > 0) {
    lines.push('# Pré-requisitos:');
    for (const pre of meta.prerequisites) {
      lines.push(`#   - ${pre}`);
    }
  }

  lines.push(`# Tempo estimado:  ~${meta.estimatedMinutes} minuto${meta.estimatedMinutes === 1 ? '' : 's'}`);

  if (meta.usage && meta.usage.length > 0) {
    lines.push('#');
    lines.push('# Uso:');
    for (const u of meta.usage) {
      lines.push(`#   ${u}`);
    }
  }

  lines.push('#');
  lines.push(`# Gerado por lovable-migrate v${VERSION}`);
  lines.push(`# Projeto: ${meta.projectName}`);
  lines.push(`# Target:  ${meta.targetDisplayName}`);
  lines.push(`# ${'-'.repeat(78)}`);
  lines.push('');
  lines.push('set -euo pipefail');
  lines.push('');
  lines.push('# Cores para diferenciar mensagens — não afetam comportamento.');
  lines.push('INFO="\\033[1;34m[INFO]\\033[0m"');
  lines.push('OK="\\033[1;32m[ OK ]\\033[0m"');
  lines.push('WARN="\\033[1;33m[WARN]\\033[0m"');
  lines.push('FAIL="\\033[1;31m[FAIL]\\033[0m"');
  lines.push('');

  return lines.join('\n');
}

/** Bloco "exige root" reutilizado pelos scripts que rodam no servidor. */
const REQUIRE_ROOT = [
  '# Esse script altera arquivos do sistema — precisa rodar como root.',
  'if [[ ${EUID} -ne 0 ]]; then',
  '  echo -e "${WARN} Esse script precisa de privilégios de root."',
  '  echo "     Rode novamente com: sudo bash $(basename \\"$0\\")"',
  '  exit 1',
  'fi',
  '',
].join('\n');

// ─── Builders por script ──────────────────────────────────────────────────────

function buildSetupVpsScript(ctx: ProjectContext, config: GuideConfig): BashScriptFile {
  const projectName = ctx.analysis?.projectName ?? ctx.meta.name;

  const content = [
    header({
      filename: SCRIPT_FILENAMES['setup-vps'],
      title: 'preparação inicial do servidor',
      purposeLines: [
        'O que esse script faz:',
        '  1. Atualiza a lista de pacotes do sistema (apt-get update)',
        '  2. Aplica todas as atualizações de segurança (apt-get upgrade)',
        '  3. Define o fuso horário para UTC (padrão para servidores)',
        '  4. Instala e configura o firewall UFW liberando SSH, HTTP e HTTPS',
      ],
      executionLocation: 'remote',
      prerequisites: [
        'Estar logado como root (ou ter sudo)',
        `Sistema operacional: ${config.profile.defaultOs}`,
      ],
      estimatedMinutes: 3,
      projectName,
      targetDisplayName: config.profile.displayName,
    }),
    REQUIRE_ROOT,
    '# ─── 1. Atualização do sistema ──────────────────────────────────────────────',
    '# "apt-get update" baixa a lista mais recente de pacotes disponíveis.',
    '# Sem isso, o servidor pode instalar versões antigas.',
    'echo -e "${INFO} Atualizando lista de pacotes..."',
    'apt-get update -y',
    '',
    '# "apt-get upgrade -y" aplica as atualizações pendentes. DEBIAN_FRONTEND',
    '# evita prompts interativos durante o upgrade (necessário em scripts).',
    'echo -e "${INFO} Instalando atualizações de segurança..."',
    'DEBIAN_FRONTEND=noninteractive apt-get upgrade -y',
    '',
    '# ─── 2. Fuso horário ────────────────────────────────────────────────────────',
    '# Definir um timezone consistente facilita ler logs e correlacionar eventos.',
    '# Usamos UTC por padrão. Para horário de Brasília, troque por "America/Sao_Paulo".',
    'echo -e "${INFO} Definindo fuso horário como UTC..."',
    'timedatectl set-timezone UTC',
    '',
    '# ─── 3. Firewall básico (UFW) ───────────────────────────────────────────────',
    '# UFW é o firewall padrão do Ubuntu. Liberamos apenas as portas necessárias:',
    '#   - 22  (SSH)   → para você acessar o servidor',
    '#   - 80  (HTTP)  → para Nginx servir a aplicação',
    '#   - 443 (HTTPS) → para o cadeado verde após o SSL',
    '# Todo o resto fica bloqueado por padrão.',
    'echo -e "${INFO} Instalando UFW (firewall)..."',
    'apt-get install -y ufw',
    '',
    'echo -e "${INFO} Aplicando regras do firewall..."',
    'ufw allow OpenSSH',
    'ufw allow 80/tcp',
    'ufw allow 443/tcp',
    '',
    '# "--force enable" ativa o UFW sem pedir confirmação interativa.',
    'ufw --force enable',
    '',
    '# ─── Conclusão ──────────────────────────────────────────────────────────────',
    'echo -e "${OK} VPS preparado."',
    `echo "     Próximo passo: instale o Docker → bash ${SCRIPTS_DIR}/${SCRIPT_FILENAMES['install-docker']}"`,
    '',
  ].join('\n');

  return {
    key: 'setup-vps',
    filename: SCRIPT_FILENAMES['setup-vps'],
    relativePath: `${SCRIPTS_DIR}/${SCRIPT_FILENAMES['setup-vps']}`,
    purpose: 'Atualiza o sistema, define timezone e configura firewall básico (UFW).',
    executionLocation: 'remote',
    estimatedMinutes: 3,
    requiresArguments: false,
    content,
  };
}

function buildInstallDockerScript(ctx: ProjectContext, config: GuideConfig): BashScriptFile {
  const projectName = ctx.analysis?.projectName ?? ctx.meta.name;

  const content = [
    header({
      filename: SCRIPT_FILENAMES['install-docker'],
      title: 'instalação do Docker Engine + Compose plugin',
      purposeLines: [
        'O que esse script faz:',
        '  1. Baixa e instala o Docker Engine (método oficial: get.docker.com)',
        '  2. Instala o plugin docker-compose-plugin (comando "docker compose")',
        '  3. Habilita o Docker no boot do servidor (systemctl enable)',
        '  4. Valida a instalação chamando "docker --version" e "docker compose version"',
      ],
      executionLocation: 'remote',
      prerequisites: [
        `01-setup-vps.sh já executado`,
        'Estar logado como root',
      ],
      estimatedMinutes: 3,
      projectName,
      targetDisplayName: config.profile.displayName,
    }),
    REQUIRE_ROOT,
    '# ─── 1. Docker Engine ───────────────────────────────────────────────────────',
    '# Usamos o script oficial fornecido pela Docker (https://get.docker.com).',
    '# É o método recomendado pela própria Docker para instalação rápida em VPS.',
    'if command -v docker >/dev/null 2>&1; then',
    '  echo -e "${INFO} Docker já está instalado: $(docker --version)"',
    'else',
    '  echo -e "${INFO} Baixando script oficial da Docker..."',
    '  curl -fsSL https://get.docker.com -o /tmp/get-docker.sh',
    '  sh /tmp/get-docker.sh',
    '  rm -f /tmp/get-docker.sh',
    'fi',
    '',
    '# ─── 2. Docker Compose Plugin ───────────────────────────────────────────────',
    '# O comando moderno é "docker compose" (com espaço, via plugin).',
    '# A maioria das instalações já vem com o plugin, mas garantimos aqui.',
    'echo -e "${INFO} Garantindo o plugin docker-compose-plugin..."',
    'apt-get install -y docker-compose-plugin',
    '',
    '# ─── 3. Habilita Docker no boot ─────────────────────────────────────────────',
    '# Garante que o Docker seja iniciado automaticamente se o servidor reiniciar.',
    'echo -e "${INFO} Habilitando Docker no boot do servidor..."',
    'systemctl enable docker',
    'systemctl start docker',
    '',
    '# ─── 4. Validação ───────────────────────────────────────────────────────────',
    'echo -e "${INFO} Validando instalação..."',
    'docker --version',
    'docker compose version',
    '',
    '# Pequeno smoke test: tenta um "docker info" e falha se não conseguir.',
    'if ! docker info >/dev/null 2>&1; then',
    '  echo -e "${FAIL} Docker instalado mas o daemon não respondeu."',
    '  echo "     Tente: systemctl restart docker  &&  docker info"',
    '  exit 1',
    'fi',
    '',
    'echo -e "${OK} Docker e Compose instalados."',
    `echo "     Próximo passo (NO SEU COMPUTADOR): bash ${SCRIPTS_DIR}/${SCRIPT_FILENAMES['upload']} SEU_IP"`,
    '',
  ].join('\n');

  return {
    key: 'install-docker',
    filename: SCRIPT_FILENAMES['install-docker'],
    relativePath: `${SCRIPTS_DIR}/${SCRIPT_FILENAMES['install-docker']}`,
    purpose: 'Instala Docker Engine e o plugin Compose, habilita no boot e valida.',
    executionLocation: 'remote',
    estimatedMinutes: 3,
    requiresArguments: false,
    content,
  };
}

function buildUploadScript(ctx: ProjectContext, config: GuideConfig): BashScriptFile {
  const projectName = ctx.analysis?.projectName ?? ctx.meta.name;
  const remoteUser = config.profile.defaultUser;

  // Empacotamento via tar+ssh streaming = menos conexões SSH e mais rápido que múltiplos scp.
  // Detecta a presença de .env e o inclui condicionalmente — sem .env o deploy ainda funciona,
  // mas o usuário precisa criá-lo no servidor antes do 04-deploy-app.sh.
  const content = [
    header({
      filename: SCRIPT_FILENAMES['upload'],
      title: 'empacota e envia o projeto para o servidor',
      purposeLines: [
        'O que esse script faz:',
        '  1. Lê o IP do servidor passado como argumento',
        '  2. Cria o diretório remoto (caso não exista)',
        '  3. Empacota a pasta docker/ (e o .env se existir) em tar.gz',
        '  4. Envia para o servidor via SSH streaming (tar | ssh tar)',
        '  5. Confirma que os arquivos chegaram',
        '',
        'IMPORTANTE: esse é o ÚNICO script da série que roda no SEU COMPUTADOR.',
        'Os demais (01, 02, 04, 05, 06) rodam no servidor via SSH.',
      ],
      executionLocation: 'local',
      prerequisites: [
        'ssh e tar disponíveis (Linux/macOS já têm; Windows: use WSL ou Git Bash)',
        '02-install-docker.sh já executado no servidor',
        'Você consegue rodar `ssh ' + remoteUser + '@SEU_IP` sem erro',
      ],
      estimatedMinutes: 4,
      usage: [
        `bash ${SCRIPT_FILENAMES['upload']} <IP_DO_SERVIDOR>`,
        `Exemplo: bash ${SCRIPT_FILENAMES['upload']} 123.45.67.89`,
      ],
      projectName,
      targetDisplayName: config.profile.displayName,
    }),
    '# ─── 0. Argumentos ──────────────────────────────────────────────────────────',
    'if [[ $# -lt 1 ]]; then',
    '  echo -e "${WARN} Uso: bash $(basename \\"$0\\") <IP_DO_SERVIDOR>"',
    '  echo "     Exemplo: bash $(basename \\"$0\\") 123.45.67.89"',
    '  exit 1',
    'fi',
    '',
    'SERVER_IP="$1"',
    `REMOTE_USER="${remoteUser}"`,
    `REMOTE_PATH="${config.remotePath}"`,
    `PROJECT_NAME="${projectName}"`,
    '',
    '# Esse script está em deployment-guide/scripts/, então a raiz do projeto',
    '# (onde estão docker/ e .env) é dois níveis acima.',
    'LOCAL_ARTIFACTS_DIR="$(cd "$(dirname "$0")/../.." && pwd)"',
    '',
    'echo -e "${INFO} Projeto:  ${PROJECT_NAME}"',
    'echo -e "${INFO} Origem:   ${LOCAL_ARTIFACTS_DIR}"',
    'echo -e "${INFO} Destino:  ${REMOTE_USER}@${SERVER_IP}:${REMOTE_PATH}"',
    '',
    '# ─── 1. Verificações locais ─────────────────────────────────────────────────',
    'if [[ ! -d "${LOCAL_ARTIFACTS_DIR}/docker" ]]; then',
    '  echo -e "${FAIL} Diretório docker/ não encontrado em ${LOCAL_ARTIFACTS_DIR}."',
    '  echo "     Esse script precisa rodar a partir de deployment-guide/scripts/."',
    '  exit 1',
    'fi',
    '',
    '# Monta a lista de arquivos a enviar — sempre docker/, .env só se existir.',
    'TAR_ARGS=("docker")',
    'if [[ -f "${LOCAL_ARTIFACTS_DIR}/.env" ]]; then',
    '  TAR_ARGS+=(".env")',
    '  echo -e "${INFO} Incluindo .env no upload."',
    'else',
    '  echo -e "${WARN} .env não encontrado — você precisará criá-lo no servidor."',
    'fi',
    '',
    '# ─── 2. Envio via tar | ssh tar ─────────────────────────────────────────────',
    '# Esse pipeline:',
    '#   - empacota localmente em memória (tar -czf -)',
    '#   - envia o stream via ssh',
    '#   - extrai no servidor (tar -xzf -)',
    '# Não cria arquivos temporários grandes nem deixa lixo no /tmp.',
    'echo -e "${INFO} Enviando (pode demorar alguns minutos)..."',
    'tar -czf - -C "${LOCAL_ARTIFACTS_DIR}" "${TAR_ARGS[@]}" \\',
    '  | ssh "${REMOTE_USER}@${SERVER_IP}" "mkdir -p \\"${REMOTE_PATH}\\" && tar -xzf - -C \\"${REMOTE_PATH}\\""',
    '',
    '# ─── 3. Conferência ─────────────────────────────────────────────────────────',
    'echo -e "${INFO} Confirmando arquivos no servidor..."',
    'ssh "${REMOTE_USER}@${SERVER_IP}" "ls -la ${REMOTE_PATH}/docker"',
    '',
    'echo -e "${OK} Upload concluído."',
    `echo "     Próximo passo (NO SERVIDOR): bash \${REMOTE_PATH}/deployment-guide/scripts/${SCRIPT_FILENAMES['deploy']}"`,
    `echo "     ↑ rode lá depois de fazer ssh \${REMOTE_USER}@\${SERVER_IP}"`,
    '',
  ].join('\n');

  return {
    key: 'upload',
    filename: SCRIPT_FILENAMES['upload'],
    relativePath: `${SCRIPTS_DIR}/${SCRIPT_FILENAMES['upload']}`,
    purpose: 'Empacota docker/ + .env e envia para o servidor via tar|ssh streaming.',
    executionLocation: 'local',
    estimatedMinutes: 4,
    requiresArguments: true,
    content,
  };
}

function buildDeployScript(ctx: ProjectContext, config: GuideConfig): BashScriptFile {
  const projectName = ctx.analysis?.projectName ?? ctx.meta.name;

  const content = [
    header({
      filename: SCRIPT_FILENAMES['deploy'],
      title: 'sobe a aplicação com Docker Compose',
      purposeLines: [
        'O que esse script faz:',
        '  1. Verifica que docker/ e .env existem em <REMOTE_PATH>',
        '  2. Executa "docker compose up -d --build" — sobe os containers em background',
        '  3. Mostra o status dos containers (docker compose ps)',
        '  4. Imprime as últimas 30 linhas de log para diagnóstico rápido',
      ],
      executionLocation: 'remote',
      prerequisites: [
        '02-install-docker.sh executado no servidor',
        '03-upload-app.sh executado no seu computador (arquivos já no servidor)',
        `.env preenchido em ${config.remotePath}/.env (se a app usar variáveis)`,
      ],
      estimatedMinutes: 5,
      projectName,
      targetDisplayName: config.profile.displayName,
    }),
    `REMOTE_PATH="${config.remotePath}"`,
    `APP_PORT="${config.port}"`,
    '',
    '# ─── 0. Verificações ────────────────────────────────────────────────────────',
    'if [[ ! -d "${REMOTE_PATH}/docker" ]]; then',
    '  echo -e "${FAIL} ${REMOTE_PATH}/docker não encontrado."',
    `  echo "     Rode 03-upload-app.sh do seu computador antes."`,
    '  exit 1',
    'fi',
    '',
    'if [[ ! -f "${REMOTE_PATH}/.env" ]]; then',
    '  echo -e "${WARN} ${REMOTE_PATH}/.env não encontrado."',
    '  echo "     A aplicação pode subir, mas variáveis de ambiente vão faltar."',
    '  echo "     Pressione Enter para continuar mesmo assim, ou Ctrl+C para abortar."',
    '  read -r _',
    'fi',
    '',
    '# ─── 1. Build e up ──────────────────────────────────────────────────────────',
    '# "up -d --build":',
    '#   - up:     sobe os containers descritos em docker-compose.yml',
    '#   - -d:     "detached" — roda em segundo plano (libera o terminal)',
    '#   - --build: reconstrói a imagem antes (na primeira vez demora ~2-5 min)',
    'cd "${REMOTE_PATH}/docker"',
    '',
    'echo -e "${INFO} Subindo aplicação (docker compose up -d --build)..."',
    'docker compose up -d --build',
    '',
    '# ─── 2. Status ──────────────────────────────────────────────────────────────',
    'echo -e "${INFO} Status dos containers:"',
    'docker compose ps',
    '',
    '# ─── 3. Logs iniciais ───────────────────────────────────────────────────────',
    '# Mostramos as últimas 30 linhas — geralmente já mostra erros de boot',
    '# (variável faltando, porta em uso, etc).',
    'echo -e "${INFO} Últimas 30 linhas de log:"',
    'docker compose logs --tail=30 || true',
    '',
    '# ─── Conclusão ──────────────────────────────────────────────────────────────',
    'echo -e "${OK} Deploy concluído."',
    'echo "     Teste no navegador: http://<IP_DO_SERVIDOR>:${APP_PORT}"',
    'echo "     Para acompanhar logs ao vivo: docker compose logs -f"',
    `echo "     Próximo passo (opcional): bash ${SCRIPTS_DIR}/${SCRIPT_FILENAMES['ssl']} <SEU_DOMINIO> <SEU_EMAIL>"`,
    '',
  ].join('\n');

  return {
    key: 'deploy',
    filename: SCRIPT_FILENAMES['deploy'],
    relativePath: `${SCRIPTS_DIR}/${SCRIPT_FILENAMES['deploy']}`,
    purpose: 'Executa docker compose up -d --build e reporta status + logs iniciais.',
    executionLocation: 'remote',
    estimatedMinutes: 5,
    requiresArguments: false,
    content,
  };
}

function buildSslScript(ctx: ProjectContext, config: GuideConfig): BashScriptFile {
  const projectName = ctx.analysis?.projectName ?? ctx.meta.name;

  // Defaults vêm do contexto; usuário pode sobrescrever via argumento.
  // Se o usuário não passou --domain, usamos placeholder explícito (e o script aborta
  // pedindo argumento).
  const domainDefault = config.domain ?? '__NAO_CONFIGURADO__';
  const emailDefault = config.adminEmail ?? '__NAO_CONFIGURADO__';

  const content = [
    header({
      filename: SCRIPT_FILENAMES['ssl'],
      title: 'configura Nginx + HTTPS gratuito (Let\'s Encrypt)',
      purposeLines: [
        'O que esse script faz:',
        '  1. Instala o Nginx',
        '  2. Cria um virtual host com proxy reverso para a porta da app',
        '  3. Testa a configuração (nginx -t) e recarrega o serviço',
        '  4. Instala o Certbot e solicita um certificado para <DOMAIN> + www',
        '  5. Faz um dry-run da renovação automática para garantir que vai funcionar',
      ],
      executionLocation: 'remote',
      prerequisites: [
        '04-deploy-app.sh executado (aplicação respondendo na porta interna)',
        'Domínio apontando para o IP do servidor (DNS já propagado!)',
        'Portas 80 e 443 liberadas no firewall (01-setup-vps.sh fez isso)',
      ],
      estimatedMinutes: 5,
      usage: [
        `bash ${SCRIPT_FILENAMES['ssl']} [DOMAIN] [ADMIN_EMAIL]`,
        `Exemplo: bash ${SCRIPT_FILENAMES['ssl']} meuapp.com admin@meuapp.com`,
      ],
      projectName,
      targetDisplayName: config.profile.displayName,
    }),
    REQUIRE_ROOT,
    '# ─── 0. Argumentos ──────────────────────────────────────────────────────────',
    '# Defaults vêm do contexto do projeto (passado via --domain / --admin-email',
    '# quando você gerou esse pacote). Você pode sobrescrever via argumento.',
    `DOMAIN="\${1:-${domainDefault}}"`,
    `ADMIN_EMAIL="\${2:-${emailDefault}}"`,
    `APP_PORT="${config.port}"`,
    '',
    'if [[ "${DOMAIN}" == "__NAO_CONFIGURADO__" ]]; then',
    '  echo -e "${WARN} Nenhum domínio foi fornecido."',
    '  echo "     Uso: bash $(basename \\"$0\\") <DOMAIN> <ADMIN_EMAIL>"',
    '  echo "     Exemplo: bash $(basename \\"$0\\") meuapp.com admin@meuapp.com"',
    '  exit 1',
    'fi',
    '',
    'if [[ "${ADMIN_EMAIL}" == "__NAO_CONFIGURADO__" ]]; then',
    '  echo -e "${WARN} Nenhum email foi fornecido."',
    '  echo "     O Certbot precisa de um email válido para notificações de expiração."',
    '  echo "     Uso: bash $(basename \\"$0\\") ${DOMAIN} <ADMIN_EMAIL>"',
    '  exit 1',
    'fi',
    '',
    '# ─── 1. Nginx ───────────────────────────────────────────────────────────────',
    'echo -e "${INFO} Instalando Nginx..."',
    'apt-get install -y nginx',
    '',
    '# ─── 2. Virtual host (proxy reverso) ────────────────────────────────────────',
    '# Esse arquivo diz ao Nginx: "tudo que chegar em DOMAIN, encaminhe para',
    '# http://localhost:APP_PORT". Os headers extras são necessários para',
    '# WebSockets e para a app saber o IP/host original da requisição.',
    '#',
    '# Os literais \\$http_upgrade, \\$host etc são variáveis do PRÓPRIO NGINX',
    '# (não do bash). Por isso escapamos com backslash dentro do here-doc.',
    'NGINX_CONF="/etc/nginx/sites-available/${DOMAIN}"',
    'echo -e "${INFO} Criando ${NGINX_CONF}..."',
    '',
    'cat > "${NGINX_CONF}" <<EOF',
    'server {',
    '    listen 80;',
    '    server_name ${DOMAIN} www.${DOMAIN};',
    '',
    '    location / {',
    '        proxy_pass http://localhost:${APP_PORT};',
    '        proxy_http_version 1.1;',
    '        proxy_set_header Upgrade \\$http_upgrade;',
    '        proxy_set_header Connection \'upgrade\';',
    '        proxy_set_header Host \\$host;',
    '        proxy_set_header X-Real-IP \\$remote_addr;',
    '        proxy_set_header X-Forwarded-For \\$proxy_add_x_forwarded_for;',
    '        proxy_cache_bypass \\$http_upgrade;',
    '    }',
    '}',
    'EOF',
    '',
    'ln -sf "${NGINX_CONF}" "/etc/nginx/sites-enabled/${DOMAIN}"',
    '',
    '# Remove o site default do Nginx para evitar conflito.',
    'rm -f /etc/nginx/sites-enabled/default',
    '',
    'echo -e "${INFO} Testando configuração do Nginx..."',
    'nginx -t',
    '',
    'systemctl reload nginx',
    '',
    '# ─── 3. Certbot ─────────────────────────────────────────────────────────────',
    '# Certbot é o cliente oficial do Let\'s Encrypt (gratuito).',
    '# A flag --nginx faz a validação via HTTP-01 e atualiza o arquivo do Nginx',
    '# automaticamente, adicionando o bloco listen 443 ssl e o redirect http→https.',
    'echo -e "${INFO} Instalando Certbot..."',
    'apt-get install -y certbot python3-certbot-nginx',
    '',
    'echo -e "${INFO} Solicitando certificado para ${DOMAIN} e www.${DOMAIN}..."',
    'certbot --nginx \\',
    '  -d "${DOMAIN}" \\',
    '  -d "www.${DOMAIN}" \\',
    '  --non-interactive \\',
    '  --agree-tos \\',
    '  --email "${ADMIN_EMAIL}" \\',
    '  --redirect',
    '',
    '# ─── 4. Renovação automática (dry-run) ──────────────────────────────────────',
    '# Certificados Let\'s Encrypt duram 90 dias. O Certbot cria um timer systemd',
    '# que tenta renovar automaticamente — aqui só validamos que o caminho funciona.',
    'echo -e "${INFO} Testando renovação automática (dry-run)..."',
    'certbot renew --dry-run',
    '',
    '# ─── Conclusão ──────────────────────────────────────────────────────────────',
    'echo -e "${OK} SSL configurado."',
    'echo "     Acesse agora: https://${DOMAIN}"',
    `echo "     Próximo passo: bash ${SCRIPTS_DIR}/${SCRIPT_FILENAMES['health-check']}"`,
    '',
  ].join('\n');

  return {
    key: 'ssl',
    filename: SCRIPT_FILENAMES['ssl'],
    relativePath: `${SCRIPTS_DIR}/${SCRIPT_FILENAMES['ssl']}`,
    purpose: 'Instala Nginx + Certbot, cria virtual host e provisiona certificado Let\'s Encrypt.',
    executionLocation: 'remote',
    estimatedMinutes: 5,
    requiresArguments: config.domain === null || config.adminEmail === null,
    content,
  };
}

function buildHealthCheckScript(ctx: ProjectContext, config: GuideConfig): BashScriptFile {
  const projectName = ctx.analysis?.projectName ?? ctx.meta.name;
  const domainDefault = config.domain ?? '__NAO_CONFIGURADO__';

  const content = [
    header({
      filename: SCRIPT_FILENAMES['health-check'],
      title: 'diagnóstico rápido da aplicação em produção',
      purposeLines: [
        'O que esse script faz:',
        '  - Verifica que o Docker está rodando e há pelo menos 1 container ativo',
        '  - Checa se a aplicação responde em http://localhost:<APP_PORT>',
        '  - Confirma que a porta interna está em LISTEN',
        '  - Se Nginx estiver instalado: valida config e status do serviço',
        '  - Se houver domínio: confirma DNS resolve para este IP e HTTPS responde',
        '  - Imprime as últimas 20 linhas de log para inspeção rápida',
        '',
        'Exit code: 0 se tudo passar, 1 se alguma checagem falhar.',
        'Pode ser usado em monitoramento simples (cron + alerta por e-mail).',
      ],
      executionLocation: 'remote',
      prerequisites: [
        '04-deploy-app.sh executado',
        '(opcional) 05-setup-ssl.sh, se você tem domínio',
      ],
      estimatedMinutes: 1,
      projectName,
      targetDisplayName: config.profile.displayName,
    }),
    `APP_PORT="${config.port}"`,
    `DOMAIN="${domainDefault}"`,
    `REMOTE_PATH="${config.remotePath}"`,
    '',
    'FAILED=0',
    '',
    '# Helper: roda um comando silenciosamente; imprime [OK] ou [FAIL] e incrementa contador.',
    'check() {',
    '  local label="$1"; shift',
    '  if "$@" >/dev/null 2>&1; then',
    '    echo -e "${OK} ${label}"',
    '  else',
    '    echo -e "${FAIL} ${label}"',
    '    FAILED=$((FAILED + 1))',
    '  fi',
    '}',
    '',
    'echo -e "${INFO} Diagnóstico do servidor — $(date -u +\\"%Y-%m-%d %H:%M:%S UTC\\")"',
    'echo',
    '',
    '# ─── 1. Docker ──────────────────────────────────────────────────────────────',
    'check "Docker rodando"                          systemctl is-active --quiet docker',
    'check "Pelo menos 1 container ativo"            bash -c \'docker ps --format "{{.Names}}" | grep -q .\'',
    '',
    '# ─── 2. Aplicação ───────────────────────────────────────────────────────────',
    'check "App responde em http://localhost:${APP_PORT}" \\',
    '      curl --silent --max-time 5 --fail "http://localhost:${APP_PORT}"',
    '',
    'check "Porta ${APP_PORT} em LISTEN" \\',
    '      bash -c "ss -tlnp 2>/dev/null | grep -q \':${APP_PORT}\'"',
    '',
    '# ─── 3. Nginx (se instalado) ────────────────────────────────────────────────',
    'if command -v nginx >/dev/null 2>&1; then',
    '  check "Configuração do Nginx válida (nginx -t)"   nginx -t',
    '  check "Nginx rodando"                              systemctl is-active --quiet nginx',
    'else',
    '  echo -e "${INFO} Nginx não instalado — pulando checagens HTTP públicas."',
    'fi',
    '',
    '# ─── 4. HTTPS / Domínio (se configurado) ────────────────────────────────────',
    'if [[ "${DOMAIN}" != "__NAO_CONFIGURADO__" ]]; then',
    '  RESOLVED_IP="$(getent hosts \\"${DOMAIN}\\" 2>/dev/null | awk \'{print $1}\' | head -n1 || true)"',
    '  SERVER_IP="$(curl --silent --max-time 3 ifconfig.me 2>/dev/null || echo \'\')"',
    '  if [[ -n "${RESOLVED_IP}" && -n "${SERVER_IP}" && "${RESOLVED_IP}" == "${SERVER_IP}" ]]; then',
    '    echo -e "${OK} Domínio ${DOMAIN} resolve para este servidor"',
    '  else',
    '    echo -e "${FAIL} Domínio ${DOMAIN} NÃO resolve para este servidor (DNS pode não ter propagado)"',
    '    FAILED=$((FAILED + 1))',
    '  fi',
    '',
    '  check "HTTPS responde em https://${DOMAIN}" \\',
    '        curl --silent --max-time 8 --fail "https://${DOMAIN}"',
    'else',
    '  echo -e "${INFO} Domínio não configurado — pulando checagens HTTPS."',
    'fi',
    '',
    '# ─── 5. Logs recentes (informativo) ─────────────────────────────────────────',
    'echo',
    'echo -e "${INFO} Últimas 20 linhas de log do Compose:"',
    'if [[ -d "${REMOTE_PATH}/docker" ]]; then',
    '  (cd "${REMOTE_PATH}/docker" && docker compose logs --tail=20 || true)',
    'else',
    '  echo "     (diretório ${REMOTE_PATH}/docker não encontrado)"',
    'fi',
    '',
    '# ─── Resultado ──────────────────────────────────────────────────────────────',
    'echo',
    'if [[ ${FAILED} -gt 0 ]]; then',
    '  echo -e "${FAIL} ${FAILED} checagem(ns) falhou."',
    '  echo "     Investigue: docker compose logs --tail=200, journalctl -u nginx, certbot certificates"',
    '  exit 1',
    'fi',
    '',
    'echo -e "${OK} Todas as checagens passaram."',
    'exit 0',
    '',
  ].join('\n');

  return {
    key: 'health-check',
    filename: SCRIPT_FILENAMES['health-check'],
    relativePath: `${SCRIPTS_DIR}/${SCRIPT_FILENAMES['health-check']}`,
    purpose: 'Checa Docker, app, Nginx, DNS e HTTPS — retorna exit 0/1 (apto a cron).',
    executionLocation: 'remote',
    estimatedMinutes: 1,
    requiresArguments: false,
    content,
  };
}

// ─── Task pública ─────────────────────────────────────────────────────────────

/**
 * Ordem fixa dos scripts — define a numeração do filename (`01-`, `02-`, …)
 * e a sequência de execução recomendada. Mantida como constante para que
 * a numeração nunca dependa da ordem em que builders são chamados.
 */
const SCRIPT_ORDER: readonly BashScriptKey[] = [
  'setup-vps',
  'install-docker',
  'upload',
  'deploy',
  'ssl',
  'health-check',
] as const;

const BUILDERS: Record<BashScriptKey, (ctx: ProjectContext, config: GuideConfig) => BashScriptFile> = {
  'setup-vps':      buildSetupVpsScript,
  'install-docker': buildInstallDockerScript,
  'upload':         buildUploadScript,
  'deploy':         buildDeployScript,
  'ssl':            buildSslScript,
  'health-check':   buildHealthCheckScript,
};

/**
 * Gera todos os scripts bash do pacote de deploy assistido.
 *
 * Cada script é construído por uma função pura `buildXScript(ctx, config)` —
 * testáveis isoladamente e seguros para adicionar/remover/reordenar.
 *
 * Pré-condições (validadas em `guideProject`):
 *  - `ctx.analysis` preenchido (para `projectName`)
 *  - `ctx.plan` preenchido
 *
 * O artefato resultante NUNCA executa nada — apenas grava arquivos `.sh` em
 * `deployment-guide/scripts/`. A execução é sempre manual, pelo usuário.
 */
export function generateScripts(
  ctx: ProjectContext,
  config: GuideConfig,
): BashScriptsArtifact {
  const scripts: BashScriptFile[] = SCRIPT_ORDER.map((key) => BUILDERS[key](ctx, config));

  const scriptsByKey = Object.fromEntries(
    scripts.map((s) => [s.key, s]),
  ) as Record<BashScriptKey, BashScriptFile>;

  const files: GeneratedFile[] = scripts.map((s) => ({
    relativePath: s.relativePath,
    content: s.content,
    description: s.purpose,
  }));

  const estimatedMinutes = scripts.reduce((acc, s) => acc + s.estimatedMinutes, 0);
  const chmodCommand = `chmod +x ${SCRIPTS_DIR}/*.sh`;

  return {
    files,
    scripts,
    scriptsByKey,
    totalScripts: scripts.length,
    estimatedMinutes,
    chmodCommand,
    scriptsDir: SCRIPTS_DIR,
  };
}

// ─── Re-exports internos para testes ──────────────────────────────────────────

/**
 * Builders exportados individualmente para testes unitários — permitem testar
 * cada script isoladamente, sem rodar o pipeline inteiro.
 *
 * Não fazem parte da API pública; consumidores externos devem usar `generateScripts`.
 */
export const __scriptBuilders = {
  buildSetupVpsScript,
  buildInstallDockerScript,
  buildUploadScript,
  buildDeployScript,
  buildSslScript,
  buildHealthCheckScript,
};
