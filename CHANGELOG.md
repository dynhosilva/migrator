# Changelog

Todas as mudanças notáveis neste projeto serão documentadas aqui.

O formato segue [Keep a Changelog](https://keepachangelog.com/pt-BR/1.0.0/),
e este projeto adere ao [Versionamento Semântico](https://semver.org/lang/pt-BR/).

---

## [0.1.0] — 2026-05-10

### Lançamento inicial

Primeira versão pública do `lovable-migrate` — engine completa de migração para projetos exportados do Lovable.dev.

### Adicionado

#### Pipeline central

- **Analyze** — detecção automática de stack via `DetectorRegistry` com 10 detectores independentes: framework (React, Vue, Svelte, Next.js), build system (Vite, Webpack, CRA, Next), package manager (npm, yarn, pnpm, bun), linguagem (TypeScript/JavaScript), Tailwind, Supabase (auth, storage, migrations, edge functions), Lovable config, env vars, rotas e arquivos críticos
- **Plan** — geração de `MigrationPlan` via `PlannerRegistry` com 7 strategies: compatibility, infrastructure, env, supabase, deployStrategy, risks e checklist
- **Validate** — gate de segurança via `ValidationRegistry` com 7 rules; `safeToMigrate: false` bloqueia o pipeline (superável com `--force`)
- **Migrate** — geração de artefatos filesystem (`.env.example`, migrations SQL, edge functions, instruções de deploy, relatório)
- **Deploy** — geração de Dockerfile multi-estágio otimizado por stack, `docker-compose.yml` e `.dockerignore`
- **Execute** — verificação de pré-condições de ambiente + geração de `execution-plan.json` e `dry-run.md`
- **Runtime** — execução local controlada: `npm install`, `npm run build`, `docker build` com sandbox de whitelist e `shell: false`
- **Remote** — planejamento de deploy remoto (sem SSH real): validação de host/SSH, plano de transferência, plano de execução com comandos prontos

#### Camadas de transporte

- **CLI** — 8 comandos: `inspect`, `analyze`, `plan`, `validate`, `migrate`, `deploy`, `execute`, `remote`, `ui`, `server`
- **API HTTP** — Fastify com rate limiting (200 req/min/IP), envelope padronizado, 8 endpoints REST, 8 códigos de erro estruturados
- **TUI** — wizard interativo (Ink/React): 12 telas, navegação por teclado, revisão interativa de cada fase, confirmação explícita antes de escrita em disco

#### Infraestrutura

- TypeScript strict — compilação ES2020/CommonJS
- 233 testes (Vitest) — integração, snapshots, TUI, packaging
- CI/CD — GitHub Actions com Node matrix [20, 22]
- Release pipeline — tags semânticas → `npm publish` automático
- Documentação completa — 9 documentos em `docs/`

### Arquitetura

- `ProjectContext` imutável — cada fase retorna novo contexto via spread, nunca muta
- Registry dinâmico — adicionar detector/strategy/rule/task = criar arquivo + registrar; sem alterar orquestrador
- Camadas desacopladas — CLI, API e TUI não contêm lógica de domínio
- Sandbox de execução — whitelist estrita + `spawn({ shell: false })`
- Writer isolado — única camada com I/O de disco; valida paths antes de escrever

### Stacks suportadas

React, Vue 3, Svelte/SvelteKit, Next.js, Node API, HTML estático  
Package managers: npm, yarn, pnpm, bun  
Supabase: auth, storage, realtime, migrations, edge functions

---

## Próximas versões (planejado)

Ver [ROADMAP.md](ROADMAP.md) para detalhes.

- **v0.2.0** — Re-sync com Lovable/Supabase
- **v0.3.0** — Supabase CLI integration (migrations automáticas)
- **v0.4.0** — Hostinger VPS deploy integration
- **v1.0.0** — API estável, full feature parity
