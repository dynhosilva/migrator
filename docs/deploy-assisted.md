# Deploy Assistido

> Publique o seu projeto Lovable no seu próprio servidor, com a confiança de quem entende o que está fazendo.

O **Deploy Assistido** é o jeito que o `lovable-migrate` ajuda você a sair do ambiente do Lovable.dev e colocar a sua aplicação rodando num VPS — sem você precisar virar especialista em Linux, Docker ou Nginx para isso.

---

## O que é

Quando você roda `lovable-migrate guide ./meu-projeto`, três artefatos são gerados em `output/<projeto>/deployment-guide/`:

| Artefato | Para que serve |
|---|---|
| `DEPLOY.md` | Guia narrativo em PT-BR — explica **o quê**, **como** e **por quê** de cada passo. Lê uma vez para entender. |
| `CHECKLIST.md` | Checklist verificável com checkboxes — você marca conforme avança. Tempo estimado por item. |
| `scripts/01..06.sh` | Scripts bash contextuais, prontos para executar. Cada um faz uma etapa do deploy. |

Os três são **complementares**:

```
DEPLOY.md (entender)  →  CHECKLIST.md (acompanhar)  →  scripts/*.sh (executar)
```

Você não precisa usar os três — escolha o que combina com a sua experiência:

- **Iniciante:** lê o `DEPLOY.md`, segue o `CHECKLIST.md`, copia os comandos manualmente.
- **Intermediário:** lê o `DEPLOY.md` rapidamente, segue o checklist, roda os scripts.
- **Quem já fez antes:** roda os scripts direto, usa o checklist como referência.

---

## Qual problema isso resolve

Você exportou um projeto do Lovable.dev. Ele roda no ambiente deles. Agora você quer hospedar por conta própria — em VPS, Docker, com seu próprio Supabase.

Sem ajuda, o caminho é assustador:

- Onde compro o servidor?
- Como entro nele?
- O que instalo primeiro?
- Como envio os arquivos?
- Como configuro o domínio?
- Como ativo HTTPS?
- E se der erro?

O Deploy Assistido responde **cada uma dessas perguntas** com:
- Um passo numerado no `DEPLOY.md` que explica em PT-BR
- Um item no `CHECKLIST.md` com tempo estimado
- Um script que executa o passo automaticamente (opcional)

---

## Por que não é "1-click deploy"

Existem ferramentas que prometem deploy num clique. Elas funcionam — até o dia em que algo dá errado e você não tem ideia do que aconteceu, porque tudo era mágica.

O `lovable-migrate` é diferente por escolha:

| Filosofia |
|---|
| **Educar > Automatizar.** O `DEPLOY.md` explica cada comando antes de você executar. Você termina o deploy entendendo o que aconteceu. |
| **Você no controle.** Nada roda na sua máquina ou no servidor sem você executar manualmente. Sem agentes, sem daemons, sem conexões em background. |
| **Sem vendor lock-in.** Os artefatos gerados são markdown e bash — você consegue ler, modificar, versionar, levar para qualquer servidor. |
| **Sem telemetria.** A engine roda 100% local. Não envia dados de uso para servidor algum. |

Quando algo dá errado num deploy assistido, você **sabe onde olhar**. Quando algo dá errado num 1-click deploy, você abre um ticket e espera.

---

## Como funciona o fluxo completo

Visão de alto nível, do projeto Lovable até o site no ar:

```
1. Você exporta o projeto do Lovable.dev
        ↓
2. lovable-migrate analyze  →  detecta stack, framework, env vars, Supabase
        ↓
3. lovable-migrate deploy   →  gera Dockerfile + docker-compose + artefatos
        ↓
4. lovable-migrate guide    →  gera DEPLOY.md + CHECKLIST.md + scripts bash
        ↓
5. Você lê o DEPLOY.md      →  entende o caminho
        ↓
6. Você segue o CHECKLIST   →  marca cada passo conforme avança
        ↓
7. (opcional) Roda scripts  →  acelera passos que você já entendeu
        ↓
8. Site no ar com HTTPS     →  https://meuapp.com
```

Na prática, o passo 5 e o passo 6 acontecem ao mesmo tempo: você abre o `DEPLOY.md` numa aba e o `CHECKLIST.md` em outra, e vai alternando.

---

## O que você vai fazer no servidor

Por dentro do `DEPLOY.md`, os 9 passos cobrem:

| Passo | O que acontece |
|---|---|
| 1. Preparar o VPS | Confirmar IP, anotar dados de acesso |
| 2. Abrir terminal SSH | Conectar no servidor |
| 3. Atualizar sistema + Docker | `apt update`, `apt upgrade`, instalar Docker e Compose |
| 4. Enviar arquivos | `scp` ou `tar | ssh tar` do seu computador para o servidor |
| 5. Configurar `.env` | Variáveis de ambiente (URLs, chaves, segredos) |
| 6. Subir a aplicação | `docker compose up -d --build` |
| 7. Configurar DNS | Registro A apontando o domínio para o IP |
| 8. Configurar Nginx | Proxy reverso para a porta da aplicação |
| 9. Ativar HTTPS | Certbot + Let's Encrypt (grátis, renova sozinho) |

Cada passo tem **tempo estimado**, **comando exato** e **callout** com o erro mais comum daquele passo.

---

## O que esperar

### Tempo realista

| Cenário | Tempo |
|---|---|
| Já fez deploy uma vez, tudo dá certo | **30-45 min** |
| Primeira vez, leitura cuidadosa | **1-2 horas** |
| Algo dá errado, precisa consultar troubleshooting | **2-4 horas** |

Não é uma corrida. O `CHECKLIST.md` mostra tempo estimado por item, então você sabe se está dentro do esperado.

### O que vai mudar no servidor

Os scripts modificam o servidor de algumas formas — listadas explicitamente no `DEPLOY.md`:

- Sistema é atualizado (`apt-get upgrade`)
- Firewall (UFW) é ativado, liberando apenas portas 22, 80 e 443
- Docker é instalado e configurado para iniciar no boot
- Timezone é definido como UTC (você pode mudar)
- Nginx é instalado (se você tem domínio)
- Certificados SSL são provisionados (se você tem domínio)

Esse impacto é zero num VPS recém-criado dedicado ao seu projeto. Se você usa o servidor para outras coisas, o `DEPLOY.md` avisa o que pode ser afetado.

### Propagação de DNS

O passo mais demorado **não é técnico** — é DNS. Configurar um registro A demora **5 minutos a 24 horas** para propagar pela internet. Na maioria das vezes leva 10-30 min, mas você não controla isso.

Os scripts `05-setup-ssl.sh` e `06-health-check.sh` verificam a propagação automaticamente — se o DNS ainda não bate, eles param com mensagem clara e pedem para você esperar mais.

### Erros comuns que podem acontecer

O `DEPLOY.md` antecipa os 5 erros mais frequentes, com tradução leiga e solução:

| Erro | Quando acontece | Solução |
|---|---|---|
| `Permission denied` | Logou como usuário sem privilégios | Use `sudo` ou conecte com `root` |
| `Connection refused` | IP errado ou servidor desligado | Confira o IP no painel do provedor |
| `DNS problem` (Certbot) | DNS ainda não propagou | Espere 5-30 min, tente de novo |
| App sobe mas não responde | Variável faltando em `.env` | O `04-deploy-app.sh` lista quais |
| `Address already in use` | Outro serviço na mesma porta | `ss -tlnp` para descobrir qual |

Todos os 5 estão na seção **Solução de problemas** do `DEPLOY.md` com o comando exato para resolver.

---

## Segurança

### O que o `lovable-migrate` faz

- **Roda 100% local** — sem telemetria, sem conexão de rede durante a geração
- **Nunca modifica o projeto original** — toda escrita vai para `--output`
- **Sandbox no runtime** — execução de comandos é whitelisted, sem shell
- **Path traversal protegido** — escrita em disco valida que está dentro do `outputDir`

### O que o `lovable-migrate` **não faz** (você faz)

- **Não abre SSH** — você abre, no seu terminal, quando quiser
- **Não executa scripts no servidor** — você executa, manualmente
- **Não armazena credenciais** — `.env` fica no seu computador e no seu servidor
- **Não tem agente em background** — não há processo daemon, não há serviço persistente

Os scripts gerados são `.sh` que **você** lê e **você** executa. Eles têm comentários PT-BR explicando linha a linha o que cada comando faz. Antes de rodar qualquer um, abra o arquivo e leia.

---

## Limitações atuais

Sincero — o Deploy Assistido v1 tem escopo definido:

### Hoje funciona muito bem para

- **Hostinger VPS** com Ubuntu 22.04 LTS (provider de referência)
- Aplicações **React/Vite, Next.js, Vue, Svelte** com Docker
- Projetos com **Supabase** já provisionado (você usa o seu projeto Supabase)
- Domínio único com `www` opcional (`meuapp.com` + `www.meuapp.com`)
- **Um único servidor** rodando a aplicação

### Hoje **não** funciona

- ❌ **Sem SSH automation** — você abre o SSH manualmente, executa os comandos manualmente
- ❌ **Sem múltiplos servidores** — é deploy de servidor único, não cluster
- ❌ **Sem provider gerenciado** — Vercel, Railway, Render não estão no escopo (use a CLI nativa deles para esses)
- ❌ **Sem domínios IDN** — domínios com caracteres acentuados ou unicode não são suportados ainda
- ❌ **Sem subdomínios complexos** — `app.empresa.com` funciona, mas o setup é manual
- ❌ **Sem AWS Lightsail / DigitalOcean dedicados** — caem em perfil genérico (funciona, só não tem instruções específicas do painel)

### O que **nunca** vai fazer (anti-goals)

- ❌ Executar comandos no seu servidor sem você autorizar manualmente
- ❌ Enviar telemetria
- ❌ Armazenar suas chaves/segredos em algum lugar
- ❌ Modificar o projeto original
- ❌ Esconder o que está acontecendo (todos os comandos vêm com comentário explicativo)

---

## Melhores práticas

### Antes do primeiro deploy

- [ ] Comprar VPS com Ubuntu 22.04 LTS (ver [`hostinger.md`](hostinger.md))
- [ ] Comprar domínio (ou já ter um — domínio é opcional, mas recomendado)
- [ ] Ter as chaves do Supabase em mãos (Project Settings → API)
- [ ] Reservar 1-2h de calma para a primeira vez

### Durante o deploy

- **Não pule passos do `CHECKLIST.md`** — eles existem em ordem por uma razão.
- **Leia o callout antes de executar** — cada passo tem o aviso do erro mais comum.
- **Se travar 10 min, vá para Solução de problemas** no `DEPLOY.md`. Quase tudo já está documentado.
- **Rode o `06-health-check.sh` no final.** Ele detecta automaticamente o que está fora do ar.

### Depois do deploy

- **Salve o `CHECKLIST.md` no Git** junto com o projeto — registro do que foi feito.
- **Renovação do certificado SSL é automática** (Certbot timer + Let's Encrypt). Não precisa fazer nada.
- **Para atualizar a aplicação:** repita o passo 4 (envio) + passo 6 (`docker compose up -d --build`). O Docker rebuild só o que mudou.

---

## Comando único

```bash
lovable-migrate guide ./meu-projeto \
  --target hostinger \
  --domain meuapp.com \
  --admin-email voce@exemplo.com \
  --output ./output/meu-projeto
```

Saída:
```
Pacote de deploy assistido gerado:
  deployment-guide/DEPLOY.md     — guia narrativo passo a passo (PT-BR)
  deployment-guide/CHECKLIST.md  — checklist operacional verificável
  deployment-guide/scripts/      — 6 scripts bash contextuais
  Antes de rodar os scripts:      chmod +x deployment-guide/scripts/*.sh
```

Flags:

| Flag | Default | Função |
|---|---|---|
| `--target <provider>` | `hostinger` | Provider de VPS (`hostinger`, `generic`, `digitalocean`, `aws-lightsail`) |
| `--domain <dominio>` | — | Domínio sem `www.` e sem `https://`. Ex: `meuapp.com` |
| `--port <numero>` | detectado | Porta da app. Se omitido, usa a porta do Dockerfile |
| `--remote-path <path>` | `/opt/app` | Caminho no servidor |
| `--admin-email <email>` | — | Email para notificações do Certbot |
| `--output <dir>` | `./output/<projeto>` | Diretório de saída |
| `-f json` | — | Output em JSON em vez de terminal renderizado |

---

## Para quem é o Deploy Assistido

### Perfeito para você se

- Está saindo do Lovable.dev pela primeira vez
- Quer entender o que está acontecendo, não só executar
- Prefere VPS próprio em vez de PaaS gerenciado
- Não tem time de DevOps
- Já fez um projeto pessoal antes, mas nunca tinha publicado

### Provavelmente não é para você se

- Você já tem pipeline de CI/CD estabelecido (gere os artefatos `migrate`/`deploy` e use no seu pipeline)
- Você usa Vercel/Netlify e está feliz lá
- Você precisa de cluster Kubernetes (escopo errado)
- Você quer deploy 100% automatizado sem intervenção (filosofia diferente — veja Coolify, Dokku)

---

## Próximos passos

- **Quer começar?** Leia [`getting-started.md`](getting-started.md) para instalar e fazer o primeiro `analyze`.
- **Vai usar Hostinger?** [`hostinger.md`](hostinger.md) tem custos, planos recomendados e problemas comuns desse provider.
- **Quer entender por dentro?** [`guide.md`](guide.md) é a referência técnica do módulo (para quem mexe no código).
- **Curioso sobre a engine completa?** [`architecture.md`](architecture.md) tem o pipeline inteiro.

---

## FAQ rápido

**Posso usar com outro provider que não seja Hostinger?**
Sim. Use `--target generic` para instruções neutras (qualquer VPS Ubuntu/Debian) ou aguarde perfis dedicados para DigitalOcean e AWS Lightsail.

**Preciso de domínio para fazer o deploy?**
Não. Sem domínio, a aplicação fica acessível pelo IP (sem HTTPS). Você pode adicionar domínio depois — basta regenerar o pacote com `--domain`.

**Os scripts são seguros para rodar?**
Sim — todos são `.sh` com `set -euo pipefail` e comentários explicando cada comando. Antes de rodar pela primeira vez, abra e leia. Eles fazem exatamente o que o `DEPLOY.md` descreve, nada mais.

**E se eu já fiz parte do deploy manualmente?**
Sem problema — execute só os scripts que faltam. Cada um é independente e tem pré-condições explícitas no header.

**Como atualizar a aplicação depois?**
Repita o passo 4 (enviar arquivos) + passo 6 (`docker compose up -d --build`). Vamos adicionar um `07-update-app.sh` numa próxima versão para automatizar isso.

**O `lovable-migrate` substitui o Git?**
Não. Versione o seu código no Git como sempre. O `output/` gerado pelo `lovable-migrate` é separado e pode entrar (ou não) no Git, dependendo da sua preferência.

**Posso usar com Supabase self-hosted?**
Sim — a engine apenas detecta variáveis Supabase e gera instruções. Os valores do `.env` apontam para o seu Supabase, gerenciado ou self-hosted.
