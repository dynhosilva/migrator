# lovable-migrate

> **De Lovable.dev para produção em um comando.**

[![npm version](https://img.shields.io/npm/v/lovable-migrate.svg)](https://www.npmjs.com/package/lovable-migrate)
[![CI](https://github.com/dynhosilva/migrator/actions/workflows/ci.yml/badge.svg)](https://github.com/dynhosilva/migrator/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/node-%3E%3D20.0.0-brightgreen.svg)](https://nodejs.org/)

🇺🇸 [English version](README.md)

---

```bash
npx lovable-migrate demo   # veja em ação agora — sem instalar
```

<p align="center">
  <img src="docs/media/demo-analysis.png"
       alt="lovable-migrate detectando React 18 · Supabase · Tailwind · shadcn/ui automaticamente"
       width="760">
</p>

Detecta sua stack automaticamente, identifica Supabase (auth, storage, migrations, edge functions), gera Dockerfile multi-stage, cria workflows GitHub Actions prontos para uso e planeja o deploy remoto — **sem modificar seu projeto original.**

---

## Quick Start

```bash
# Veja em ação — sem instalar, sem precisar de um projeto
npx lovable-migrate demo

# Pipeline completo — gera todos os artefatos
lovable-migrate deploy ./meu-projeto --output ./output/meu-projeto

# Wizard interativo — recomendado para primeiros projetos
lovable-migrate ui
```

---

## Como funciona

```
1. Analisa     → detecta framework, Supabase, env vars, rotas, build system
2. Planeja     → gera estratégia de deploy, riscos e checklist de migração
3. Gera        → Dockerfile + GitHub Actions + plano de execução — tudo em segundos
```

O projeto original nunca é modificado. Todos os artefatos vão para `--output`.

---

## O que você recebe

Execute `lovable-migrate deploy ./meu-projeto` e receba imediatamente:

```
output/meu-projeto/
├── .github/
│   └── workflows/
│       ├── ci.yml              # CI: push + PR · Node [20, 22] · npm cache
│       └── release.yml         # Release: tag v* · npm publish --dry-run
├── docker/
│   ├── Dockerfile              # Multi-stage otimizado para sua stack
│   ├── docker-compose.yml      # Healthcheck e volumes configurados
│   └── .dockerignore
├── env/
│   └── .env.example            # Todas as variáveis de ambiente detectadas
├── deploy/
│   └── deploy-instructions.md  # Comandos prontos para copiar
├── execution/
│   ├── execution-plan.json
│   └── dry-run.md              # Preview antes de executar qualquer coisa
└── reports/
    └── migration-summary.json
```

Se Supabase for detectado, também gera:

```
├── supabase/
│   ├── migrations/             # Cópias das migrations para aplicar no destino
│   └── functions/<nome>/      # Edge Functions prontas para deploy via CLI
```

---

## Terminal preview

<p align="center">
  <img src="docs/media/demo-full.gif"
       alt="lovable-migrate demo — 25 segundos do banner à lista de artefatos"
       width="760">
</p>

```
$ npx lovable-migrate demo

  ╔══════════════════════════════════════════════════════╗
  ║  lovable-migrate · demo                              ║
  ╚══════════════════════════════════════════════════════╝

  Projeto de exemplo: my-saas-app
  React 18 · TypeScript · Vite · Supabase · Tailwind · shadcn/ui

  ┌──────────────────────────────────────────────────────┐
  │  Relatório de Análise                                │
  └──────────────────────────────────────────────────────┘

  Projeto            my-saas-app
  Framework          react
  Linguagem          typescript  (15 ts)
  Build system       vite
  Package mgr        npm
  Lovable            ✓  .lovable

  Supabase
  ──────────────────────────────────────────────────────
  ✓  Detectado
  ✓  Auth
  ✓  Storage
  ✓  Realtime
  Migrations         2 arquivos
    20240101000000_initial.sql
    20240115000000_add_teams.sql
  Edge Functions     2
    send-email
    process-payment

  Variáveis de ambiente
  ──────────────────────────────────────────────────────
  VITE_SUPABASE_URL
  VITE_SUPABASE_ANON_KEY
  VITE_APP_URL
  VITE_STRIPE_PUBLIC_KEY

  Rotas
  ──────────────────────────────────────────────────────
  /  ·  /auth  ·  /dashboard
  /settings  ·  /profile

  [ ... Plano de Migração · Checklist · Validação ... ]

  ┌──────────────────────────────────────────────────────┐
  │  O que deploy geraria para este projeto              │
  └──────────────────────────────────────────────────────┘

  GitHub Actions
  ✓  .github/workflows/ci.yml         push + PR · Node [20, 22] · npm cache
  ✓  .github/workflows/release.yml    tag v* · npm publish --dry-run

  Docker
  ✓  docker/Dockerfile                multi-stage · nginx:alpine
  ✓  docker/docker-compose.yml        healthcheck · volumes
  ✓  docker/.dockerignore

  Configuração
  ✓  env/.env.example                 4 variáveis detectadas
  ✓  deploy/deploy-instructions.md    comandos prontos para copiar
  ✓  supabase/migrations/             2 arquivos SQL
  ✓  supabase/functions/              2 Edge Functions

  Execução e planejamento
  ✓  execution/execution-plan.json
  ✓  execution/dry-run.md             preview sem executar nada
  ✓  reports/migration-summary.json

  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  ✓  Análise concluída — nenhum bloqueador detectado.

  Pronto para migrar seu projeto real?

    lovable-migrate deploy ./meu-projeto
    lovable-migrate ui               wizard interativo — recomendado
```

---

## Instalação

```bash
npm install -g lovable-migrate
lovable-migrate --version   # verifica a instalação
```

**Requisito:** Node.js >= 20.0.0

---

## Pipeline

Cada comando executa as fases anteriores mais a sua:

```
analyze   → detecta stack, framework, env vars, Supabase
plan      → gera estratégia de deploy e lista de riscos
validate  → verifica segurança — bloqueia migrações inseguras
migrate   → gera artefatos (env, SQL, instruções)
deploy    → gera Dockerfile + docker-compose
cicd      → gera .github/workflows/ci.yml e release.yml
execute   → verifica ambiente + gera plano de execução
remote    → planeja deploy remoto (sem SSH real)
```

```bash
# Apenas análise — zero efeitos colaterais
lovable-migrate analyze ./projeto

# Gerar Dockerfile + artefatos + GitHub Actions
lovable-migrate deploy ./projeto --output ./output

# Planejar deploy remoto
lovable-migrate remote ./projeto \
  --ssh-host meu-servidor.com \
  --ssh-user deploy \
  --remote-path /opt/minha-app
```

---

## Stacks suportadas

| Framework | Build System | Deploy Strategy |
|---|---|---|
| React | Vite, CRA, Webpack | Static (nginx) |
| Vue 3 | Vite | Static (nginx) |
| Svelte / SvelteKit | Vite | Static (nginx) |
| Next.js | Next | Node Server |
| Node API | — | Docker (node) |
| Static HTML | — | Static (nginx) |

**Package managers:** npm, yarn, pnpm, bun

**Detectado automaticamente:** Supabase (auth, storage, migrations, edge functions), Tailwind, Shadcn/ui

---

## GitHub Actions

O comando `deploy` gera automaticamente dois workflows prontos para uso:

**`.github/workflows/ci.yml`** — executado em todo push e pull request:

```yaml
# Generated by lovable-migrate — do not edit manually
name: CI
on:
  push:
    branches:
      - main
  pull_request:
    branches:
      - main
jobs:
  build:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        node-version:
          - 20
          - 22
    steps:
      - uses: actions/checkout@v4
      - name: Set up Node.js ${{ matrix.node-version }}
        uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node-version }}
          cache: npm
      - name: Install dependencies
        run: npm ci
      - name: Build
        run: npm run build
      - name: Test          # incluído apenas se scripts.test existir em package.json
        run: npm test
```

**`.github/workflows/release.yml`** — executado ao fazer push de uma tag `v*`:

```yaml
# Generated by lovable-migrate — do not edit manually
name: Release
on:
  push:
    tags:
      - v*
jobs:
  publish:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Set up Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 20
          registry-url: https://registry.npmjs.org
          cache: npm
      - name: Install dependencies
        run: npm ci
      - name: Build
        run: npm run build
      - name: Publish (dry-run)
        run: npm publish --dry-run  # seguro por padrão — sem NPM_TOKEN necessário
```

### Filosofia

| Princípio | Implementação |
|---|---|
| **Determinístico** | Mesmo projeto → mesmo YAML, em qualquer máquina, em qualquer execução |
| **Seguro por padrão** | `npm publish --dry-run` — publica sem efeito até o usuário ativar |
| **Zero secrets** | Nenhuma referência a `secrets.*` no arquivo gerado |
| **Zero cloud coupling** | Sem GitHub API, sem OIDC, sem Hostinger — só YAML estático |
| **Condicional ao projeto** | Steps `build` e `test` incluídos apenas se os scripts existem |

Para ativar publicação real no release.yml, adicione a variável de ambiente manualmente:

```yaml
      - name: Publish
        run: npm publish
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
```

Exemplos reais gerados: [`examples/generated-workflows/`](examples/generated-workflows/)

Documentação completa: [docs/cicd.md](docs/cicd.md)

---

## TUI — Wizard interativo

```bash
lovable-migrate ui
```

O wizard guia você por cada fase com revisão interativa:

```
Welcome
  → Informar caminho do projeto
  → [Analyze + Plan automático]
  → Revisar stack detectada
  → Revisar plano e riscos
  → Revisar resultado da validação
  → Confirmar antes de escrever em disco
  → [Migrate + Deploy + Execute + Remote]
  → Revisar dry-run gerado
  → Resumo final com acesso aos artefatos
```

---

## API HTTP

```bash
lovable-migrate server --port 3001
```

```bash
# Verificar saúde
curl http://localhost:3001/health

# Analisar projeto
curl -X POST http://localhost:3001/analyze \
  -H "Content-Type: application/json" \
  -d '{"input": "/path/to/projeto"}'

# Pipeline completo
curl -X POST http://localhost:3001/deploy \
  -H "Content-Type: application/json" \
  -d '{"input": "/path/to/projeto", "output": "./output/meu-projeto"}'
```

**Endpoints disponíveis:** `/health` · `/version` · `/capabilities` · `/analyze` · `/plan` · `/validate` · `/migrate` · `/deploy` · `/execute` · `/remote`

Documentação completa: [docs/api.md](docs/api.md)

---

## Filosofia

### O projeto original nunca é modificado

Todos os artefatos são gerados em um diretório de saída separado. O `lovable-migrate` lê o projeto, analisa, e escreve apenas em `--output`. Jamais toca nos arquivos originais.

### Dry-run por padrão

Antes de qualquer operação real, o pipeline gera um `dry-run.md` com preview de tudo que seria executado. Você revisa antes de confirmar.

### Conservador por design

Se não há dados suficientes para uma decisão segura, o planner usa `confidence: unknown` e lista riscos explicitamente. Sem suposições silenciosas.

### Sandbox de execução

O runtime executa apenas uma whitelist estrita de executáveis (`node`, `npm`, `npx`, `pnpm`, `yarn`, `bun`, `docker`) com `shell: false` — injeção via argumentos é impossível ao nível do SO.

### Validação explícita

A fase `validate` pode bloquear o pipeline com `safeToMigrate: false`. Para prosseguir em casos onde você sabe o que está fazendo (ex: env vars ainda não configuradas), use `--force`.

---

## Arquitetura

```
ProjectContext (imutável — espinha dorsal do pipeline)
     │
     ├── analyzeContext()   → AnalysisReport
     │     DetectorRegistry (10 detectores independentes)
     │
     ├── planContext()      → MigrationPlan
     │     PlannerRegistry (7 strategies)
     │
     ├── validateContext()  → ValidationResult
     │     ValidationRegistry (7 rules)
     │
     ├── migrateContext()   → MigrationResult     [escreve disk]
     ├── deployContext()    → DeployState          [escreve disk]
     ├── cicdContext()      → CicdState            [escreve disk]
     ├── executeContext()   → ExecutionState       [escreve disk]
     ├── runContext()       → RuntimeState         [executa comandos]
     └── prepareContext()   → RemoteState          [planejamento puro]

Camadas de transporte (sem lógica de domínio):
     ├── CLI     — Commander
     ├── API     — Fastify (thin layer)
     └── TUI     — Ink/React (wizard)
```

Cada fase recebe `ProjectContext` e retorna **novo** contexto via spread — imutabilidade garantida. Adicionar uma fase nova não requer alterar o orquestrador.

Documentação detalhada: [docs/architecture.md](docs/architecture.md) · [docs/architecture-overview.md](docs/architecture-overview.md)

---

## Exemplos

Veja a pasta [`examples/`](examples/) para projetos funcionais:

| Exemplo | Stack | Demonstra |
|---|---|---|
| [`strat-forge-pro`](examples/strat-forge-pro/) | React + Vite + Supabase + Bun | Projeto real exportado do Lovable.dev |
| [`vite-react`](examples/vite-react/) | React + Vite + TypeScript | Caso mais comum — deploy static |
| [`next-supabase`](examples/next-supabase/) | Next.js + Supabase | Deploy node-server + banco |
| [`minimal-static`](examples/minimal-static/) | HTML + JS | Projeto mínimo sem framework |
| [`vue-vite`](examples/vue-vite/) | Vue 3 + Vite | Stack alternativa |
| [`node-api`](examples/node-api/) | Node.js + Express | Backend sem frontend |

---

## Roadmap

| Status | Item |
|---|---|
| ✅ | Analyze — detecção de stack, framework, Supabase |
| ✅ | Plan — estratégia de deploy e plano de migração |
| ✅ | Validate — gate de segurança com bloqueio explícito |
| ✅ | Migrate — geração de artefatos filesystem |
| ✅ | Deploy — Dockerfile + docker-compose multi-estágio |
| ✅ | Execute — verificação de ambiente + plano de execução |
| ✅ | Runtime — build local controlado com sandbox |
| ✅ | Remote — planejamento de deploy remoto |
| ✅ | API HTTP — Fastify com rate limiting |
| ✅ | TUI — wizard interativo (Ink/React) |
| ✅ | GitHub Actions generator — ci.yml + release.yml determinísticos |
| 🔲 | Re-sync — re-sincronização com Lovable/Supabase |
| 🔲 | Hostinger integration — deploy automático em VPS |
| 🔲 | Supabase CLI integration — execute migrations automaticamente |

Roadmap completo: [ROADMAP.md](ROADMAP.md)

---

## Segurança

- Nenhuma fase modifica o projeto original
- Toda escrita em disco valida que o path está dentro do `outputDir`
- Runtime usa sandbox com whitelist de executáveis e `shell: false`
- Remote não abre conexões SSH reais
- API valida schema e bloqueia campos extras por padrão
- Rate limiting padrão: 200 req/min por IP

Para reportar vulnerabilidades: [SECURITY.md](SECURITY.md)

---

## Contribuindo

Contribuições são bem-vindas! Veja [CONTRIBUTING.md](CONTRIBUTING.md) para o guia completo.

```bash
git clone https://github.com/dynhosilva/migrator
cd lovable-migrate
npm install
npm run dev -- demo           # veja o demo funcionando
npm run dev -- analyze ./examples/vite-react
```

---

## Documentação

| Documento | Descrição |
|---|---|
| [Primeiros passos](docs/getting-started.md) | Instalação e primeiro projeto |
| [CLI — referência](docs/cli.md) | Todos os comandos e flags |
| [API HTTP](docs/api.md) | Endpoints e envelopes de resposta |
| [TUI](docs/tui.md) | Wizard interativo — navegação e atalhos |
| [Arquitetura](docs/architecture.md) | Pipeline, módulos e decisões de design |
| [Visão geral pública](docs/architecture-overview.md) | Arquitetura para contribuidores |
| [Runtime](docs/runtime.md) | Execução segura — sandbox e whitelist |
| [Deploy remoto](docs/remote.md) | Planejamento SSH e host profiles |
| [GitHub Actions](docs/cicd.md) | Geração de workflows — arquitetura, builders, filosofia |
| [Desenvolvimento](docs/development.md) | Setup, testes e como adicionar fases |
| [Screenshots](docs/screenshots.md) | Guia para capturas promocionais |
| [GIF storyboard](docs/gif-storyboard.md) | Narrativa e sequência do GIF de demonstração |
| [GIF production](docs/gif-production.md) | Comandos exatos para gravar e exportar o GIF |
| [Social preview](docs/social-preview.md) | Specs da imagem de preview social (GitHub, Twitter, LinkedIn) |
| [Launch assets](docs/launch-assets.md) | Tweet, Product Hunt, YouTube — copy de lançamento |
| [Social assets](docs/social-assets.md) | Templates de imagem por plataforma |

---

## Licença

[MIT](LICENSE) — © 2026 lovable-migrate contributors
