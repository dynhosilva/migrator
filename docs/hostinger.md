# Deploy em Hostinger VPS

> Guia específico para fazer o deploy do seu projeto Lovable em uma VPS da Hostinger usando o `lovable-migrate`.

A Hostinger é o **provider de referência** do `lovable-migrate` — todas as instruções do Deploy Assistido foram pensadas e testadas com VPS Hostinger rodando Ubuntu 22.04 LTS. Esse documento complementa o [`deploy-assisted.md`](deploy-assisted.md) com as particularidades desse provider.

---

## Por que Hostinger

- **Custo baixo** — planos a partir de ~R$ 24/mês com configurações suficientes para a maioria dos projetos
- **Painel simples (hPanel)** — interface visual em PT-BR, sem complicação técnica
- **Terminal no navegador** — você não precisa nem abrir SSH local, dá para tudo pelo navegador
- **Suporte 24/7 em PT-BR** — chat ao vivo para problemas de rede ou SO (não para sua aplicação, mas resolve os problemas mais comuns)
- **Portas abertas por padrão** — 22 (SSH), 80 (HTTP), 443 (HTTPS) já vêm liberadas

Se você está começando, é a opção com **menor fricção** entre comprar a VPS e ver o site no ar.

---

## Custos estimados

Valores aproximados em R$ no momento da escrita. Veja [hostinger.com.br](https://www.hostinger.com.br/) para preços atuais.

| Item | Custo mensal | Custo anual |
|---|---|---|
| **VPS KVM 2** (recomendado) — 2 vCPU, 8 GB RAM, 100 GB NVMe | ~R$ 35 | ~R$ 420 |
| **VPS KVM 1** (mínimo) — 1 vCPU, 4 GB RAM, 50 GB NVMe | ~R$ 24 | ~R$ 290 |
| **Domínio .com.br** | — | ~R$ 40 |
| **Domínio .com / .app / .dev** | — | ~R$ 80 |
| **SSL (Let's Encrypt)** | grátis | grátis |

**Custo realista para o primeiro ano:** entre R$ 330 e R$ 500 dependendo do plano da VPS e do domínio.

A Hostinger frequentemente tem promoções no primeiro pagamento (40-70% off). Vale verificar antes de comprar.

---

## Requisitos mínimos

Para rodar uma aplicação Lovable típica (React/Vite + Supabase remoto):

| Recurso | Mínimo | Recomendado |
|---|---|---|
| **vCPU** | 1 | 2 |
| **RAM** | 2 GB | 4-8 GB |
| **Disco** | 20 GB | 50+ GB |
| **SO** | Ubuntu 20.04 ou 22.04 | **Ubuntu 22.04 LTS** |
| **Largura de banda** | 1 TB/mês | 2+ TB/mês |

O Docker (que vai rodar a sua app) consome ~500 MB de RAM em idle. A imagem da sua aplicação Lovable empacotada geralmente ocupa 200-500 MB no disco. Sobra espaço de sobra com o plano KVM 1.

**Use Ubuntu 22.04 LTS.** Todos os scripts do `lovable-migrate` foram testados nesse SO. Outras distros (Debian 12) funcionam, mas você pode precisar ajustar comandos manualmente.

---

## Criação da VPS — passo a passo

### 1. Comprar a VPS

1. Acesse [hostinger.com.br](https://www.hostinger.com.br/) e crie conta (ou use a existente)
2. No menu, escolha **VPS Hosting**
3. Selecione o plano **KVM 2** (ou KVM 1 se está apertado de orçamento)
4. Período: sugerido 12 meses (desconto maior)
5. Conclua o pagamento

### 2. Configurar o sistema operacional

Logo após a compra, a Hostinger pergunta o SO. Escolha:

```
Operating System:  Ubuntu 22.04 with Docker LTS
```

Se a opção "with Docker" estiver disponível, escolha ela — vai pular o passo de instalação do Docker mais tarde. Se não, escolha **Ubuntu 22.04 LTS** puro (o script `02-install-docker.sh` instala depois).

### 3. Anotar os dados de acesso

Quando o provisionamento terminar (~2-5 min), vá em **VPS → Visão geral** no hPanel. Anote:

- **IP público** — algo como `145.79.92.18`
- **Usuário SSH** — geralmente `root`
- **Senha root** — em **VPS → Acesso SSH**, gere ou redefina se não lembrar

Esses três dados são tudo o que você precisa para o `lovable-migrate` daqui em diante.

---

## Acesso SSH — duas opções

### Opção A — Terminal no navegador (mais fácil)

1. No hPanel, abra a sua VPS
2. Clique em **Terminal de navegador**
3. Uma janela preta abre — pronto, você está dentro do servidor

**Vantagem:** zero configuração local. Funciona em qualquer computador com navegador.

**Limitação:** copiar/colar é mais chato que num terminal real. Use Ctrl+Shift+V para colar no Linux/Windows.

### Opção B — Terminal local (SSH)

No seu computador (macOS/Linux usa Terminal nativo; Windows use Windows Terminal ou Git Bash):

```bash
ssh root@SEU_IP_AQUI
```

Na primeira conexão, digite `yes` para aceitar o fingerprint. Depois, a senha root.

**Vantagem:** integra melhor com o seu fluxo de trabalho (copiar arquivos, abrir vários terminais).

**Recomendação:** use a Opção A na primeira vez para testar tudo; migre para B depois.

---

## DNS na Hostinger — configurando o domínio

Se você comprou o domínio na Hostinger:

1. No hPanel, vá em **Domínios → Seus domínios**
2. Clique no domínio que vai usar
3. Aba **DNS / Nameservers → Gerenciar registros DNS**
4. Adicione/edite os dois registros A:

| Tipo | Nome | Valor | TTL |
|---|---|---|---|
| A | `@` | `SEU_IP_DA_VPS` | 3600 |
| A | `www` | `SEU_IP_DA_VPS` | 3600 |

O `@` aponta o domínio raiz (`meuapp.com`); o `www` faz o mesmo para `www.meuapp.com`. Tempo de propagação: **5 minutos a 24 horas** (normalmente 10-30 min).

Se o domínio é de outro registrador (Registro.br, GoDaddy), o processo é equivalente — procure por "Gerenciar DNS" ou "Zona DNS" no painel deles.

> 🟢 **Dica:** rode `ping meuapp.com` no seu computador. Se aparecer o IP da VPS, o DNS propagou. Se aparecer o IP antigo ou der timeout, espere mais e tente de novo.

---

## O fluxo completo com `lovable-migrate`

Resumo do caminho do projeto Lovable ao site no ar:

```bash
# 1. No seu computador — gera os artefatos
lovable-migrate guide ./meu-projeto-lovable \
  --target hostinger \
  --domain meuapp.com \
  --admin-email voce@exemplo.com \
  --output ./output/meu-projeto

# 2. Liberar execução dos scripts (uma vez)
cd ./output/meu-projeto
chmod +x deployment-guide/scripts/*.sh

# 3. No SEU computador — envia o projeto para a VPS
bash deployment-guide/scripts/03-upload-app.sh SEU_IP_DA_VPS

# 4. NO SERVIDOR (via SSH ou terminal Hostinger) — prepara o servidor
bash /opt/app/deployment-guide/scripts/01-setup-vps.sh
bash /opt/app/deployment-guide/scripts/02-install-docker.sh

# 5. NO SERVIDOR — preenche o .env e sobe a app
nano /opt/app/.env       # cole as variáveis (ex: SUPABASE_URL, SUPABASE_ANON_KEY)
bash /opt/app/deployment-guide/scripts/04-deploy-app.sh

# 6. NO SERVIDOR — configura HTTPS (depois do DNS propagar)
bash /opt/app/deployment-guide/scripts/05-setup-ssl.sh meuapp.com voce@exemplo.com

# 7. NO SERVIDOR — diagnóstico final
bash /opt/app/deployment-guide/scripts/06-health-check.sh
```

**Importante:** o passo 3 é o único que roda **no seu computador**. Todo o resto roda no servidor via SSH (ou no Terminal de navegador da Hostinger).

Cada script verifica suas pré-condições no início e aborta com mensagem clara se algo estiver fora do lugar — não tem como rodar fora de ordem por acidente.

---

## Diferenças entre local e remoto

Erro #1 dos iniciantes: rodar o comando errado no lugar errado. Aqui está o mapa:

| O que você está fazendo | Onde executa | Como saber |
|---|---|---|
| Gerar artefatos (`lovable-migrate guide`) | **Seu computador** | É a CLI do `lovable-migrate` |
| Enviar arquivos (`03-upload-app.sh`) | **Seu computador** | O script usa `ssh` para enviar para a VPS |
| Atualizar sistema, instalar Docker, etc. | **Servidor (VPS)** | Você precisa estar dentro do SSH ou Terminal de navegador |
| Subir aplicação (`docker compose up`) | **Servidor** | Você está em `/opt/app/docker` no servidor |
| Editar `.env` | **Servidor** | O arquivo `.env` real fica em `/opt/app/.env` |
| Configurar DNS | **Painel do registrador** | Hostinger DNS / Registro.br / etc. |

**Regra mental:** se o comando começa com `ssh` ou `scp`, é no seu computador. Se começa com `apt`, `docker`, `nginx`, `certbot` — é no servidor.

O cabeçalho de cada script bash gerado diz explicitamente **onde executar**:

```bash
# 03-upload-app.sh
# Onde executar:   NO SEU COMPUTADOR (terminal local — não no servidor!)
```

```bash
# 04-deploy-app.sh
# Onde executar:   NO SERVIDOR (terminal SSH)
```

---

## Problemas comuns na Hostinger

### "Conexão SSH recusada" no primeiro acesso

A VPS está sendo provisionada — espera 2-5 min após a compra. No hPanel, em **VPS → Visão geral**, o status precisa estar como **Running** antes de você conseguir conectar.

### Esqueci a senha root

No hPanel, vá em **VPS → Acesso SSH → Redefinir senha root**. Gera uma senha nova na hora.

### Terminal de navegador trava ou desconecta

Acontece com sessões longas (>30 min ociosas). Feche e reabra — não perde nada porque os comandos persistem no servidor. Para sessões longas, use SSH local.

### "Permission denied (publickey)"

Algumas VPS Hostinger vêm configuradas para aceitar apenas chave SSH (sem senha). No hPanel:

- Opção A: em **VPS → Acesso SSH**, mude para "Senha" e redefina
- Opção B: cole sua chave pública SSH em **Acesso SSH → Chaves SSH** e conecte sem senha

### `docker: command not found` após instalar

Você está em outra sessão SSH iniciada antes da instalação. Desconecte e conecte de novo — o PATH é atualizado na próxima sessão.

### `apt-get` muito lento

A Hostinger usa mirrors diferentes por região. Geralmente é rápido, mas em horários de pico no Brasil pode demorar. Não há ação — só esperar. Se persistir, abra ticket no chat 24/7 da Hostinger (eles ajudam com problemas de rede).

### Site no ar mas Certbot falha com "DNS problem"

O DNS ainda não propagou. Rode no seu computador:

```bash
ping meuapp.com
```

Se aparecer outro IP, espere 10-30 min e tente o `05-setup-ssl.sh` de novo. O script tem pré-check de DNS — ele detecta isso e avisa antes de chamar Certbot.

### Domínio compradoo na Hostinger não aponta automaticamente

Comprar domínio + VPS na mesma Hostinger **não** liga eles automaticamente. Você precisa configurar manualmente os registros A no painel de DNS do domínio (ver seção "DNS na Hostinger" acima).

### "Address already in use" na porta 80

A VPS pode vir com Apache instalado por padrão em alguns planos. Pare e desinstale:

```bash
systemctl stop apache2
systemctl disable apache2
apt-get remove --purge apache2 -y
```

Depois rode o `05-setup-ssl.sh` (que instala Nginx).

---

## Diferenças entre Hostinger e outras VPS

Se você já usou DigitalOcean, AWS Lightsail, Vultr ou similares, eis o que muda:

| Aspecto | Hostinger | Outros |
|---|---|---|
| **Painel** | hPanel (PT-BR, visual) | Console específico, geralmente em inglês |
| **Terminal de navegador** | Nativo | Pode existir (DO) ou não (Lightsail) |
| **Firewall por padrão** | Aberto em 22/80/443 | Geralmente aberto em 22, fechado em 80/443 (precisa configurar) |
| **DNS gerenciado** | Painel Hostinger (se domínio também é deles) | Provider de domínio separado |
| **Suporte** | Chat 24/7 em PT-BR | E-mail/ticket, geralmente em inglês |
| **Custos** | Menores em geral | Variam — DO custa similar, AWS é mais caro |

A diferença prática mais relevante: **firewall**. Se você usar AWS Lightsail, vai precisar abrir as portas 80 e 443 manualmente no painel antes do Certbot funcionar. Na Hostinger, já está liberado.

Quando perfis dedicados de outros providers forem adicionados ao `lovable-migrate`, esses detalhes serão tratados automaticamente. Por enquanto, use `--target generic` para esses providers e ajuste o firewall manualmente.

---

## Checklist rápido

Antes de começar:

- [ ] VPS Hostinger comprada com Ubuntu 22.04 LTS
- [ ] IP público anotado
- [ ] Senha root definida (em **VPS → Acesso SSH**)
- [ ] Domínio comprado (opcional, mas recomendado)
- [ ] Chaves do Supabase em mãos (se a app usa Supabase)
- [ ] Email válido para o Certbot
- [ ] Projeto Lovable exportado em uma pasta local

Comando único que gera tudo:

```bash
lovable-migrate guide ./meu-projeto-lovable \
  --target hostinger \
  --domain meuapp.com \
  --admin-email voce@exemplo.com \
  --output ./output/meu-projeto
```

Depois é seguir o `CHECKLIST.md` na ordem.

---

## Tempos esperados na Hostinger

Referência calibrada para VPS KVM 2 com Ubuntu 22.04:

| Etapa | Tempo |
|---|---|
| Provisionamento da VPS (depois da compra) | 2-5 min |
| `01-setup-vps.sh` (update + UFW) | 3-5 min |
| `02-install-docker.sh` | 2-3 min |
| `03-upload-app.sh` | 1-3 min (depende da conexão) |
| Editar `.env` no servidor | 2-5 min |
| `04-deploy-app.sh` (primeira build) | 3-6 min |
| Propagação DNS (depois de configurar registros A) | **5 min a 24h** |
| `05-setup-ssl.sh` | 2-3 min (depois do DNS propagar) |
| `06-health-check.sh` | <1 min |

**Total prático:** entre 30 min e 2h, dominado pela espera de DNS. Tudo o que **você** executa soma ~20 min.

---

## Suporte

| Para problemas de... | Onde buscar |
|---|---|
| Hospedagem, rede, SO | Chat 24/7 Hostinger (no hPanel) |
| `lovable-migrate` (engine, scripts, artefatos) | [GitHub Issues](https://github.com/anderson/lovable-migrate/issues) |
| DNS / domínio | Painel do registrador (Hostinger Domains, Registro.br, etc.) |
| Sua aplicação (`docker compose logs`) | Documentação do framework (React/Vite, Next.js, etc.) |
| Supabase (autenticação, RLS, queries) | [Discord Supabase](https://discord.supabase.com) |

---

## Próximos passos

- **Primeiro contato com o `lovable-migrate`?** [`getting-started.md`](getting-started.md)
- **Quer entender o Deploy Assistido em profundidade?** [`deploy-assisted.md`](deploy-assisted.md)
- **Trabalhando no código do módulo `guide`?** [`guide.md`](guide.md)
- **Visão geral da arquitetura?** [`architecture.md`](architecture.md)
