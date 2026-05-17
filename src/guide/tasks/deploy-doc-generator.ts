import type { ProjectContext } from '../../core/types';
import type { GuideConfig, DeployDocArtifact, GeneratedFile } from '../types';
import type { GuideTargetProfile } from '../types';
import type { AnalysisReport } from '../../analyzer/types';
import type { MigrationPlan, DeployTarget } from '../../planner/types';
import { SCRIPTS_DIR, SCRIPT_FILENAMES } from '../constants';

// ─── Constantes de apresentação ───────────────────────────────────────────────

const STEP_COUNT = 9;            // total de passos numerados no documento
const ESTIMATED_MINUTES = 35;    // tempo médio de leitura+execução para iniciantes

const FRAMEWORK_LABEL: Record<string, string> = {
  next:    'Next.js',
  react:   'React (Vite/CRA)',
  vue:     'Vue.js',
  svelte:  'Svelte/SvelteKit',
  unknown: 'aplicação JavaScript',
};

const STRATEGY_LABEL: Record<DeployTarget, string> = {
  static:        'site estático (servido por Nginx no container)',
  'node-server': 'servidor Node.js (rodando dentro do container)',
  docker:        'container Docker padrão',
  edge:          'função edge (serverless)',
  unknown:       'estratégia genérica',
};

// ─── Helpers de formatação ────────────────────────────────────────────────────

function bashBlock(content: string): string {
  return '```bash\n' + content.trim() + '\n```';
}

function envBlock(vars: string[]): string {
  if (vars.length === 0) return '```\n# nenhuma variável de ambiente detectada\n```';
  const lines = vars.map((name) => `${name}=`).join('\n');
  return '```bash\n' + lines + '\n```';
}

function callout(emoji: string, title: string, body: string): string {
  return `> ${emoji} **${title}**  \n> ${body}`;
}

/**
 * Callout de "atalho via script" — referencia um ou mais scripts gerados em
 * `deployment-guide/scripts/` para o passo atual. O guia narrativo continua
 * sendo a fonte de verdade educacional; o script é opcional, para quem já
 * entendeu o que vai acontecer e quer acelerar.
 *
 * Aceita uma lista de scripts (cada item: filename + comando completo de uso)
 * para passos cobertos por mais de um script (ex: passo 3 = setup-vps + install-docker).
 */
function scriptShortcut(
  scripts: ReadonlyArray<{ readonly filename: string; readonly command: string }>,
  location: 'local' | 'remote',
  extra?: string,
): string {
  const where = location === 'local'
    ? 'do seu computador'
    : 'do servidor (SSH)';

  const codeLines = scripts.map((s) => `> ${s.command}`);
  const filenamesList = scripts.map((s) => `\`${SCRIPTS_DIR}/${s.filename}\``).join(' e ');
  const detail = extra ? `  \n> ${extra}` : '';

  return [
    '> 💡 **Atalho via script**  ',
    `> Esse passo já está empacotado em ${filenamesList}. No terminal ${where}, rode:`,
    '>',
    '> ```bash',
    ...codeLines,
    '> ```',
    `> Os scripts têm comentários PT-BR explicando linha a linha o que fazem.${detail}`,
  ].join('\n');
}

// ─── Seções do documento ──────────────────────────────────────────────────────

function buildHeader(ctx: ProjectContext, config: GuideConfig): string {
  const analysis = ctx.analysis!;
  const fw = FRAMEWORK_LABEL[analysis.framework] ?? FRAMEWORK_LABEL.unknown;
  const domain = config.domain ?? '(domínio ainda não configurado)';

  return [
    `# Deploy do projeto ${analysis.projectName}`,
    '',
    `Guia passo a passo para publicar o seu projeto **${fw}** em um **${config.profile.displayName}**.`,
    '',
    '| Campo | Valor |',
    '|---|---|',
    `| Projeto | \`${analysis.projectName}\` |`,
    `| Framework | ${fw} |`,
    `| Package manager | \`${analysis.packageManager}\` |`,
    `| Porta da aplicação | \`${config.port}\` |`,
    `| Domínio | \`${domain}\` |`,
    `| Sistema operacional alvo | ${config.profile.defaultOs} |`,
    `| Caminho remoto | \`${config.remotePath}\` |`,
    '',
    '---',
    '',
    callout(
      'ℹ️',
      'Para quem é esse guia',
      'Você não precisa saber Linux, Docker ou Nginx para seguir esse guia. Cada comando vem com explicação do que ele faz. Se um passo der errado, vá direto para a seção **Solução de problemas** no final.',
    ),
    '',
  ].join('\n');
}

function buildOverview(): string {
  return [
    '## O que você vai fazer',
    '',
    'O deploy é o processo de "publicar" o seu projeto em um servidor na internet. Em vez de ele rodar só no seu computador, ele passa a rodar 24h por dia em uma máquina que qualquer pessoa pode acessar pela web.',
    '',
    'Você vai fazer isso em **9 passos**:',
    '',
    '1. Preparar o VPS (servidor virtual)',
    '2. Abrir o terminal SSH (linha de comando do servidor)',
    '3. Atualizar o sistema e instalar Docker',
    '4. Enviar os arquivos do projeto para o servidor',
    '5. Configurar as variáveis de ambiente',
    '6. Subir a aplicação com Docker Compose',
    '7. Configurar o domínio (DNS)',
    '8. Configurar o Nginx (servidor web público)',
    '9. Configurar HTTPS com SSL gratuito',
    '',
    'Cada passo tem um título claro, o comando exato para copiar, e uma explicação de **o que aquele comando faz**.',
    '',
    callout(
      '🚀',
      'Atalho disponível',
      `Cada um desses passos também está empacotado como script bash em \`${SCRIPTS_DIR}/\`. Você pode ler o guia uma vez para entender, e nas próximas usar os scripts para acelerar — veja a seção **Atalhos via script** ao final do documento.`,
    ),
    '',
  ].join('\n');
}

function buildExpectations(config: GuideConfig): string {
  const profile = config.profile;
  const hasDomain = config.domain !== null;

  return [
    '## O que esperar',
    '',
    'Antes de começar, é útil saber o que vai acontecer no servidor — para você não se assustar quando coisas mudarem.',
    '',
    '### Tempo realista',
    '',
    '- **30-45 min** se você já fez deploy uma vez e tudo der certo',
    '- **1-2 horas** na primeira vez, com algumas paradas para entender o que cada comando faz',
    '- **2-4 horas** se algo der errado e você precisar consultar o troubleshooting',
    '',
    'Não há problema em demorar — não é uma corrida. Cada passo tem o tempo estimado ao lado.',
    '',
    '### O que vai mudar no servidor',
    '',
    `- O sistema vai ser **atualizado** (\`apt-get upgrade\`) — pacotes antigos serão substituídos. Em servidores que rodam outros serviços, isso pode reiniciar processos. Em um VPS recém-criado (que é o cenário recomendado), o impacto é zero.`,
    '- O **firewall** (UFW) vai ser ativado liberando apenas SSH (22), HTTP (80) e HTTPS (443). Se você usa outras portas, libere antes ou ajuste depois.',
    '- O **Docker** vai ser instalado e configurado para iniciar no boot.',
    `- O **fuso horário** vai ser definido como UTC. Para horário de Brasília, edite o script \`01-setup-vps.sh\` antes de rodar.`,
    hasDomain
      ? `- O **Nginx** vai ser configurado como proxy reverso para \`${config.domain}\` → porta interna ${config.port}.`
      : '- (Sem domínio configurado) O Nginx não será instalado nesta passada.',
    '',
    '### Propagação de DNS — o passo mais demorado',
    '',
    'Configurar o DNS do seu domínio leva **5 minutos a 24 horas** para propagar pela internet. Esse é o único passo que você não controla — depende dos servidores do seu provedor de domínio.',
    '',
    '- Na maioria das vezes propaga em 10-30 min.',
    '- Os scripts e o checklist verificam a propagação automaticamente antes de chamar o Certbot — se ainda não propagou, eles param e pedem para você esperar mais.',
    '',
    '### Erros comuns que podem acontecer',
    '',
    '- **"Permission denied"** — você não está logado como `root`. Use `sudo` ou conecte com o usuário correto.',
    `- **"Connection refused"** — o IP está errado ou o servidor está desligado. Confirme no painel ${profile.panelName}.`,
    '- **"DNS problem"** no Certbot — o DNS ainda não propagou. Espere 10 min e tente de novo.',
    '- **App sobe mas não responde** — quase sempre é uma variável faltando no `.env`. O script `04-deploy-app.sh` avisa quando detecta isso.',
    '- **"Address already in use"** — outro serviço está na mesma porta. Veja com `ss -tlnp`.',
    '',
    'Todos esses casos estão na seção **Solução de problemas** no final desse arquivo, com o comando exato para resolver.',
    '',
    callout(
      '🛟',
      'Se você travar em algum passo',
      'Pare, leia a seção **Solução de problemas** (no fim do arquivo). Quase tudo o que pode dar errado já está documentado lá. Se ainda assim não resolver, o `06-health-check.sh` faz um diagnóstico automático e aponta o que está fora do ar.',
    ),
    '',
  ].join('\n');
}

function buildGlossary(): string {
  return [
    '## Glossário rápido',
    '',
    'Se você nunca trabalhou com servidores antes, esses termos vão aparecer várias vezes:',
    '',
    '- **VPS** (Virtual Private Server): um computador na nuvem que fica ligado 24/7. Você acessa ele pela internet usando SSH.',
    '- **SSH** (Secure Shell): a forma de "entrar" no servidor pelo terminal. Você digita comandos e o servidor executa.',
    '- **Docker**: uma forma de empacotar a sua aplicação em uma "caixa" que roda igual em qualquer servidor — sem se preocupar com instalar Node, dependências, etc.',
    '- **Docker Compose**: ferramenta que sobe a sua aplicação Docker com um único comando, lendo um arquivo de configuração (`docker-compose.yml`).',
    '- **Nginx**: o "porteiro" do servidor. Recebe as requisições da internet e encaminha para a sua aplicação.',
    '- **DNS**: o sistema que liga o seu domínio (`meuapp.com`) ao IP do servidor (`123.45.67.89`).',
    '- **SSL/HTTPS**: o cadeado verde do navegador. Criptografa a comunicação entre o usuário e o servidor.',
    '',
  ].join('\n');
}

function buildStep1Vps(config: GuideConfig): string {
  const profile = config.profile;
  const items = profile.panelInstructions.map((line, i) => `${i + 1}. ${line}`).join('\n');

  return [
    `## Passo 1 — Preparar o ${profile.displayName}`,
    '',
    `Antes de qualquer coisa, você precisa de um VPS ativo. Plano recomendado: **${profile.recommendedPlan}**.`,
    '',
    `### No painel (${profile.panelName})`,
    '',
    items,
    '',
    callout(
      '✅',
      'O que você precisa ter ao final desse passo',
      `O **IP público do servidor** anotado (algo como \`123.45.67.89\`) e a confirmação de que o sistema operacional é \`${profile.defaultOs}\`.`,
    ),
    '',
  ].join('\n');
}

function buildStep2Ssh(config: GuideConfig): string {
  const profile = config.profile;
  const items = profile.sshInstructions.map((line, i) => `${i + 1}. ${line}`).join('\n');

  return [
    '## Passo 2 — Abrir o terminal SSH',
    '',
    'O terminal SSH é onde você vai digitar todos os comandos. Pense nele como uma janela direta com o servidor.',
    '',
    items,
    '',
    'Se a conexão funcionou, você verá algo como:',
    '',
    bashBlock(`Welcome to Ubuntu 22.04 LTS\n${profile.defaultUser}@servidor:~#`),
    '',
    callout(
      '⚠️',
      'A partir daqui, tudo é dentro do servidor',
      'Todos os próximos comandos são rodados dentro desse terminal SSH (no servidor), **não no seu computador local**.',
    ),
    '',
  ].join('\n');
}

function buildStep3Docker(): string {
  return [
    '## Passo 3 — Atualizar o sistema e instalar Docker',
    '',
    'O servidor vem com o sistema operacional, mas ainda não tem o Docker. Vamos atualizar tudo e instalar.',
    '',
    scriptShortcut(
      [
        { filename: SCRIPT_FILENAMES['setup-vps'],      command: `bash ${SCRIPTS_DIR}/${SCRIPT_FILENAMES['setup-vps']}` },
        { filename: SCRIPT_FILENAMES['install-docker'], command: `bash ${SCRIPTS_DIR}/${SCRIPT_FILENAMES['install-docker']}` },
      ],
      'remote',
      'Os scripts cobrem 3.1 (update do sistema + firewall básico) e 3.2/3.3/3.4 (Docker + Compose + validação).',
    ),
    '',
    '### 3.1 Atualizar o sistema',
    '',
    bashBlock('apt-get update && apt-get upgrade -y'),
    '',
    '_O que esse comando faz:_ baixa a lista de atualizações disponíveis (`update`) e instala todas (`upgrade -y` aceita automaticamente).',
    '',
    '### 3.2 Instalar Docker',
    '',
    bashBlock('curl -fsSL https://get.docker.com | sh'),
    '',
    '_O que esse comando faz:_ baixa o script oficial do Docker (`curl`) e executa (`| sh`). Esse é o método recomendado pela própria Docker.',
    '',
    '### 3.3 Instalar Docker Compose',
    '',
    bashBlock('apt-get install -y docker-compose-plugin'),
    '',
    '_O que esse comando faz:_ instala o plugin `compose` do Docker, que permite usar o comando `docker compose up`.',
    '',
    '### 3.4 Verificar instalação',
    '',
    bashBlock('docker --version\ndocker compose version'),
    '',
    'Se aparecer algo como `Docker version 24.x` e `Docker Compose version v2.x`, está tudo certo.',
    '',
  ].join('\n');
}

function buildStep4Transfer(ctx: ProjectContext, config: GuideConfig): string {
  const profile = config.profile;
  const projectName = ctx.analysis!.projectName;

  return [
    '## Passo 4 — Enviar os arquivos do projeto para o servidor',
    '',
    `O \`lovable-migrate\` já gerou todos os arquivos que o servidor precisa em \`output/${projectName}/\` no seu computador. Agora você vai copiá-los para o servidor.`,
    '',
    scriptShortcut(
      [{ filename: SCRIPT_FILENAMES['upload'], command: `bash ${SCRIPTS_DIR}/${SCRIPT_FILENAMES['upload']} SEU_IP_AQUI` }],
      'local',
      'O script cuida do `mkdir` remoto, empacota com `tar` e envia via SSH streaming (mais rápido que múltiplos `scp`).',
    ),
    '',
    '### 4.1 Criar o diretório no servidor',
    '',
    'Dentro do terminal SSH (no servidor):',
    '',
    bashBlock(`mkdir -p ${config.remotePath}\ncd ${config.remotePath}`),
    '',
    `_O que esse comando faz:_ cria a pasta \`${config.remotePath}\` (se ainda não existir) e entra nela.`,
    '',
    '### 4.2 Copiar os arquivos do seu computador para o servidor',
    '',
    'Agora abra um **segundo terminal no seu próprio computador** (não no servidor). Vamos usar `scp` para enviar os arquivos.',
    '',
    `Navegue até a pasta do projeto migrado e rode:`,
    '',
    bashBlock(
      `cd output/${projectName}\n` +
      `scp -r docker/ .env ${profile.defaultUser}@SEU_IP_AQUI:${config.remotePath}/`,
    ),
    '',
    '_O que esse comando faz:_ envia a pasta `docker/` e o arquivo `.env` para o servidor, dentro do caminho remoto. Substitua `SEU_IP_AQUI` pelo IP que você anotou no Passo 1.',
    '',
    callout(
      'ℹ️',
      'Ainda não tem o arquivo .env?',
      'Sem problema — vamos criá-lo direto no servidor no próximo passo. Pode pular essa parte do `scp` removendo `.env` do comando.',
    ),
    '',
  ].join('\n');
}

function buildStep5Env(ctx: ProjectContext, config: GuideConfig): string {
  const analysis = ctx.analysis!;
  const plan = ctx.plan!;
  const envVars = plan.env.required.length > 0 ? plan.env.required : analysis.envVars;
  const hasSupabase = analysis.supabase.detected;

  const supabaseHint = hasSupabase
    ? '\n\nEsse projeto usa **Supabase**. Você vai precisar dos seguintes valores, que estão no painel do Supabase em **Project Settings → API**:\n\n- `VITE_SUPABASE_URL` (ou `NEXT_PUBLIC_SUPABASE_URL`) — a URL do seu projeto Supabase\n- `VITE_SUPABASE_ANON_KEY` (ou `NEXT_PUBLIC_SUPABASE_ANON_KEY`) — a chave pública (anon key)\n'
    : '';

  return [
    '## Passo 5 — Configurar as variáveis de ambiente',
    '',
    'Variáveis de ambiente são os "segredos" e configurações do projeto: chaves de API, URL do banco, etc. Elas ficam em um arquivo chamado `.env`.',
    supabaseHint,
    '',
    `### 5.1 Criar o arquivo \`.env\` no servidor`,
    '',
    'No terminal SSH (no servidor):',
    '',
    bashBlock(`cd ${config.remotePath}\nnano .env`),
    '',
    '_O que esse comando faz:_ abre o editor de texto `nano` no arquivo `.env`. Para sair: `Ctrl+X`, depois `Y`, depois `Enter`.',
    '',
    '### 5.2 Cole o conteúdo abaixo e preencha os valores',
    '',
    envBlock(envVars),
    '',
    callout(
      '🔒',
      'Esses valores são secretos',
      'Nunca compartilhe esse arquivo em público (GitHub, chat, etc). Ele contém chaves que dão acesso ao seu banco e serviços.',
    ),
    '',
  ].join('\n');
}

function buildStep6Compose(config: GuideConfig): string {
  const port = config.port;

  return [
    '## Passo 6 — Subir a aplicação com Docker Compose',
    '',
    'Agora vamos ligar a aplicação. O `docker-compose.yml` que o `lovable-migrate` gerou já está configurado.',
    '',
    scriptShortcut(
      [{ filename: SCRIPT_FILENAMES['deploy'], command: `bash ${SCRIPTS_DIR}/${SCRIPT_FILENAMES['deploy']}` }],
      'remote',
      'O script verifica `.env`, faz `docker compose up -d --build` e mostra status + logs iniciais.',
    ),
    '',
    'No terminal SSH (no servidor):',
    '',
    bashBlock(`cd ${config.remotePath}/docker\ndocker compose up -d --build`),
    '',
    '_O que esse comando faz:_',
    '',
    '- `up`: inicia os containers',
    '- `-d` (detached): roda em segundo plano (você fecha o terminal e continua rodando)',
    '- `--build`: constrói a imagem Docker antes (na primeira vez, demora alguns minutos)',
    '',
    '### Verificar se subiu',
    '',
    bashBlock('docker compose ps'),
    '',
    `Se aparecer um container com status \`running\` (rodando), está no ar. Teste acessando \`http://SEU_IP_AQUI:${port}\` no navegador — você deve ver a sua aplicação.`,
    '',
    callout(
      '🐛',
      'Não abriu? Veja os logs',
      'Rode `docker compose logs --tail=100` para ver as últimas 100 linhas de log. A maioria dos erros aparece ali (variável faltando, porta em uso, etc).',
    ),
    '',
  ].join('\n');
}

function buildStep7Domain(config: GuideConfig): string {
  const profile = config.profile;
  const domain = config.domain ?? 'meuapp.com';
  const hasDomain = config.domain !== null;

  const noDomainNote = hasDomain ? '' : `\n${callout(
    'ℹ️',
    'Você ainda não configurou um domínio',
    'Este guia foi gerado sem o argumento `--domain`. Substitua todos os usos de `meuapp.com` pelo domínio real quando tiver um.',
  )}\n`;

  return [
    '## Passo 7 — Configurar o domínio (DNS)',
    '',
    `Vamos fazer com que \`${domain}\` aponte para o seu servidor.`,
    noDomainNote,
    '### Onde configurar',
    '',
    'No painel onde você comprou o domínio (Registro.br, GoDaddy, Hostinger Domains, Namecheap, etc.), procure por **"Gerenciar DNS"** ou **"Zona DNS"**.',
    '',
    '### Que registros adicionar',
    '',
    '| Tipo | Nome | Valor | TTL |',
    '|---|---|---|---|',
    `| A | @ | \`SEU_IP_AQUI\` | 3600 |`,
    `| A | www | \`SEU_IP_AQUI\` | 3600 |`,
    '',
    '_O que isso significa:_ o registro `@` aponta o domínio raiz (`meuapp.com`) para o IP. O `www` faz o mesmo para `www.meuapp.com`.',
    '',
    callout(
      '⏱',
      'O DNS demora para propagar',
      'Pode levar de 5 minutos a 24 horas para o domínio começar a apontar para o servidor. Para conferir, rode no seu computador: `ping ' + domain + '` — se aparecer o IP do servidor, está propagado.',
    ),
    '',
    ...(profile.notes.length > 0 ? [
      `### Observações sobre ${profile.displayName}`,
      '',
      profile.notes.map((n) => `- ${n}`).join('\n'),
      '',
    ] : []),
  ].join('\n');
}

function buildStep8Nginx(config: GuideConfig): string {
  const domain = config.domain ?? 'meuapp.com';
  const port = config.port;

  return [
    '## Passo 8 — Configurar o Nginx (servidor web público)',
    '',
    `Hoje, sua aplicação roda na porta \`${port}\` (acessível por \`http://SEU_IP_AQUI:${port}\`). Vamos colocar o Nginx na frente para que ela seja servida em \`http://${domain}\` (porta 80, padrão da web).`,
    '',
    '### 8.1 Instalar Nginx',
    '',
    bashBlock('apt-get install -y nginx'),
    '',
    '### 8.2 Criar arquivo de configuração',
    '',
    bashBlock(`nano /etc/nginx/sites-available/${domain}`),
    '',
    'Cole o seguinte conteúdo (substitua `' + domain + '` pelo seu domínio):',
    '',
    '```nginx',
    `server {`,
    `    listen 80;`,
    `    server_name ${domain} www.${domain};`,
    ``,
    `    location / {`,
    `        proxy_pass http://localhost:${port};`,
    `        proxy_http_version 1.1;`,
    `        proxy_set_header Upgrade $http_upgrade;`,
    `        proxy_set_header Connection 'upgrade';`,
    `        proxy_set_header Host $host;`,
    `        proxy_cache_bypass $http_upgrade;`,
    `    }`,
    `}`,
    '```',
    '',
    '_O que essa configuração faz:_ qualquer requisição que chegar em `' + domain + '` (porta 80) é encaminhada para a sua aplicação rodando na porta `' + port + '`.',
    '',
    '### 8.3 Ativar a configuração',
    '',
    bashBlock(
      `ln -s /etc/nginx/sites-available/${domain} /etc/nginx/sites-enabled/\n` +
      `nginx -t\n` +
      `systemctl reload nginx`,
    ),
    '',
    '_O que esses comandos fazem:_',
    '',
    '- `ln -s`: ativa o arquivo de configuração',
    '- `nginx -t`: testa se a configuração está correta (deve dizer `syntax is ok`)',
    '- `systemctl reload nginx`: aplica a nova configuração',
    '',
    `Agora teste \`http://${domain}\` no navegador — sua aplicação deve aparecer.`,
    '',
  ].join('\n');
}

function buildStep9Ssl(config: GuideConfig): string {
  const domain = config.domain ?? 'meuapp.com';
  const email = config.adminEmail ?? 'seu-email@exemplo.com';

  return [
    '## Passo 9 — Configurar HTTPS com SSL gratuito',
    '',
    'Vamos adicionar o cadeado verde (`https://`). Usamos o Let\'s Encrypt, que é gratuito e automático.',
    '',
    scriptShortcut(
      [{
        filename: SCRIPT_FILENAMES['ssl'],
        command: `bash ${SCRIPTS_DIR}/${SCRIPT_FILENAMES['ssl']} ${domain} ${email}`,
      }],
      'remote',
      'O script combina os Passos 8 e 9: instala Nginx + Certbot, cria o virtual host, gera o certificado e testa a renovação automática.',
    ),
    '',
    '### 9.1 Instalar Certbot',
    '',
    bashBlock('apt-get install -y certbot python3-certbot-nginx'),
    '',
    '### 9.2 Gerar o certificado',
    '',
    bashBlock(`certbot --nginx -d ${domain} -d www.${domain} --non-interactive --agree-tos --email ${email}`),
    '',
    '_O que esse comando faz:_ o Certbot pede um certificado SSL para o seu domínio, instala ele no Nginx automaticamente, e configura o redirecionamento de `http://` para `https://`.',
    '',
    callout(
      '⚠️',
      'O DNS precisa estar propagado',
      'O Certbot acessa `' + domain + '` para confirmar que você é o dono. Se o DNS ainda não propagou (Passo 7), esse comando falha. Espere alguns minutos e tente de novo.',
    ),
    '',
    '### 9.3 Renovação automática',
    '',
    'O certificado dura 90 dias e renova sozinho. Para confirmar:',
    '',
    bashBlock('systemctl status certbot.timer'),
    '',
    'Se aparecer `active (running)`, está tudo certo.',
    '',
    callout(
      '🎉',
      'Pronto!',
      `Sua aplicação está no ar em \`https://${domain}\` com cadeado verde, rodando em Docker, atrás do Nginx, com SSL gratuito que renova sozinho. Você acabou de fazer um deploy de produção profissional.`,
    ),
    '',
  ].join('\n');
}

function buildScriptShortcuts(): string {
  const rows: Array<readonly [string, string, string, string]> = [
    [SCRIPT_FILENAMES['setup-vps'],      'servidor', 'Update + timezone + UFW',                              'Passo 3'],
    [SCRIPT_FILENAMES['install-docker'], 'servidor', 'Docker Engine + Compose plugin',                       'Passo 3'],
    [SCRIPT_FILENAMES['upload'],         'local',    'Empacota e envia docker/ + .env via tar|ssh streaming', 'Passo 4'],
    [SCRIPT_FILENAMES['deploy'],         'servidor', 'docker compose up -d --build + logs',                  'Passo 6'],
    [SCRIPT_FILENAMES['ssl'],            'servidor', 'Nginx + Certbot + virtual host + renew dry-run',       'Passos 8 e 9'],
    [SCRIPT_FILENAMES['health-check'],   'servidor', 'Diagnóstico de Docker, app, Nginx, DNS, HTTPS',        'Pós-deploy'],
  ];

  const table = [
    '| Script | Onde rodar | Faz | Cobre |',
    '|---|---|---|---|',
    ...rows.map(([file, where, does, covers]) =>
      `| \`${SCRIPTS_DIR}/${file}\` | ${where} | ${does} | ${covers} |`,
    ),
  ].join('\n');

  return [
    '## Atalhos via script (opcional, mas recomendado)',
    '',
    `Todo passo acima também está empacotado como script bash em \`${SCRIPTS_DIR}/\`. Use os scripts depois de ler o guia narrativo — eles servem para acelerar e para você ter um registro reproduzível do deploy.`,
    '',
    '### Primeiro, libere a execução',
    '',
    'Os scripts vêm sem flag de execução. Antes de usá-los pela primeira vez, rode (uma única vez) onde os arquivos estiverem:',
    '',
    bashBlock(`chmod +x ${SCRIPTS_DIR}/*.sh`),
    '',
    '### Ordem recomendada de execução',
    '',
    table,
    '',
    callout(
      'ℹ️',
      'O script não substitui o guia',
      'Cada script tem comentários PT-BR explicando linha a linha o que faz. Se algo der errado, abra o `.sh` correspondente — geralmente o motivo do erro está no comentário do passo que falhou.',
    ),
    '',
  ].join('\n');
}

function buildTroubleshooting(profile: GuideTargetProfile): string {
  return [
    '## Solução de problemas',
    '',
    '### O comando `ssh` retorna "Connection refused"',
    '',
    `Verifique se o IP está correto e se o servidor está ligado no painel ${profile.panelName}. A porta 22 (SSH) precisa estar liberada — na maioria dos provedores ela já vem aberta por padrão.`,
    '',
    '### `docker compose up` falha com "permission denied"',
    '',
    'Você não está logado como `root`. Rode `sudo docker compose up -d --build` ou conecte SSH com `root`.',
    '',
    '### A aplicação subiu mas não responde no navegador',
    '',
    'Cheque os logs com `docker compose logs --tail=200`. Normalmente é uma variável de ambiente faltando no `.env` (veja Passo 5).',
    '',
    '### `nginx -t` retorna erro',
    '',
    'Olhe a mensagem — geralmente é uma chave `}` faltando no arquivo de configuração. Volte ao Passo 8.2 e revise o conteúdo colado.',
    '',
    '### Certbot retorna "DNS problem"',
    '',
    'O DNS do seu domínio ainda não propagou. Espere mais alguns minutos e teste com `ping seu-dominio.com` no seu computador — ele precisa retornar o IP do servidor.',
    '',
    '### Como atualizar a aplicação depois?',
    '',
    'Para subir uma nova versão, repita o Passo 4 (enviar arquivos) e o Passo 6 com `docker compose up -d --build`. O Docker rebuild só o que mudou — geralmente é rápido.',
    '',
    '### Onde aprender mais?',
    '',
    '- **Docker** — [docs.docker.com/get-started](https://docs.docker.com/get-started/)',
    '- **Nginx** — [nginx.org/en/docs/beginners_guide.html](https://nginx.org/en/docs/beginners_guide.html)',
    '- **Let\'s Encrypt / Certbot** — [certbot.eff.org](https://certbot.eff.org/)',
    '',
  ].join('\n');
}

function buildFooter(plan: MigrationPlan, generatedAt: string): string {
  const strategy = STRATEGY_LABEL[plan.deployStrategy.recommended] ?? STRATEGY_LABEL.unknown;
  return [
    '---',
    '',
    '### Contexto técnico',
    '',
    `- Estratégia de deploy detectada: **${plan.deployStrategy.recommended}** — ${strategy}`,
    `- Confiança da detecção: \`${plan.deployStrategy.confidence}\``,
    `- Guia gerado em: ${generatedAt}`,
    '',
    '_Esse guia foi gerado automaticamente pelo `lovable-migrate` a partir da análise do seu projeto. Para regenerar com novas configurações, rode novamente com `--target`, `--domain` ou outras flags._',
    '',
  ].join('\n');
}

// ─── Task pública ─────────────────────────────────────────────────────────────

/**
 * Gera o artefato `deployment-guide/DEPLOY.md` — narrativa completa em PT-BR.
 *
 * Pré-condições (validadas em `guideProject`):
 *  - `ctx.analysis` preenchido
 *  - `ctx.plan` preenchido
 *
 * O documento é montado por seções independentes — cada `buildStepN()` é puro
 * e pode ser testado isoladamente. Para adicionar novos passos no futuro,
 * acrescente uma função `buildStepX()` e inclua em `sections[]`.
 */
export function generateDeployDoc(
  ctx: ProjectContext,
  config: GuideConfig,
): DeployDocArtifact {
  const analysis: AnalysisReport = ctx.analysis!;
  const plan: MigrationPlan = ctx.plan!;
  const generatedAt = new Date().toISOString();

  const sections = [
    buildHeader(ctx, config),
    buildOverview(),
    buildExpectations(config),
    buildGlossary(),
    buildStep1Vps(config),
    buildStep2Ssh(config),
    buildStep3Docker(),
    buildStep4Transfer(ctx, config),
    buildStep5Env(ctx, config),
    buildStep6Compose(config),
    buildStep7Domain(config),
    buildStep8Nginx(config),
    buildStep9Ssl(config),
    // Troubleshooting vem ANTES de "Atalhos via script" — iniciante que travou
    // precisa achar a solução antes de pensar em atalho. Atalhos é seção avançada,
    // adequada como última leitura.
    buildTroubleshooting(config.profile),
    buildScriptShortcuts(),
    buildFooter(plan, generatedAt),
  ];

  const content = sections.join('\n');

  const file: GeneratedFile = {
    relativePath: 'deployment-guide/DEPLOY.md',
    content,
    description: `Guia narrativo de deploy passo a passo (${analysis.framework} → ${config.profile.displayName})`,
  };

  return {
    files: [file],
    stepCount: STEP_COUNT,
    estimatedMinutes: ESTIMATED_MINUTES,
  };
}
