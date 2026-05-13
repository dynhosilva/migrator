# Changelog

Todas as mudanças notáveis neste projeto serão documentadas aqui.

O formato segue [Keep a Changelog](https://keepachangelog.com/pt-BR/1.0.0/),
e este projeto adere ao [Versionamento Semântico](https://semver.org/lang/pt-BR/).

---

## [0.3.0] — 2026-05-13

### Demo-first UX + showcase visual

Primeira versão pública com zero-friction onboarding e assets visuais oficiais.

### Adicionado

- **`lovable-migrate demo`** — comando de demonstração com projeto de exemplo embutido
  - Zero input necessário: `npx lovable-migrate demo` funciona sem instalar globalmente
  - Fixture realista: React 18 · TypeScript · Vite · Supabase (auth + storage + realtime) · Tailwind · shadcn/ui · 2 migrations · 2 Edge Functions · 5 rotas · 4 env vars
  - Executa o pipeline completo `analyze → plan → validate` (puro, sem I/O em disco)
  - Banner de contexto + CTA acionável ao final
  - `src/demo/fixture.ts` — 21 arquivos de projeto embutidos como `ProjectFile[]`
  - `src/demo/index.ts` — `runDemo()` síncrona, testável, desacoplada do CLI
- **`scripts/capture.ts`** — geração automatizada de hero screenshot e GIF animado via Chrome headless (puppeteer-core + pngjs + gif-encoder-2)
- **`docs/media/demo-analysis.png`** — hero screenshot oficial (banner → Supabase block)
- **`docs/media/demo-full.gif`** — GIF animado com 23 keyframes, ~25s de loop

### Melhorado

- README — hero screenshot + GIF animado ativos; seção "Demo" acima de "Instalação"
- Quick Start — `demo` listado como passo 0 antes de `analyze` e `deploy`
- Output terminal — visual premium: sem caminhos absolutos, sem labels internos, pluralização correta em PT-BR em todos os módulos
- `renderCicd()` — workflows visíveis no output principal do `deploy`
- Timestamps ISO removidos do output interativo
- `program.description` do CLI — `demo` incluído nos exemplos de uso

### Testes

- 272 testes (Vitest) — 18 arquivos de teste
- `test/integration/demo.test.ts` — 14 asserções sobre fixture + pipeline + `runDemo()`

---

## [0.2.0] — 2026-05-12

### GitHub Actions generator

Geração determinística de workflows GitHub Actions a partir da análise do projeto.

### Adicionado

- **Módulo cicd** (`src/cicd/`) — nova fase do pipeline: `analyze → plan → validate → migrate → deploy → cicd → execute`
- `cicdProject()` e `cicdContext()` — mesma convenção de todos os outros módulos
- `CicdRegistry` — registry síncrono com o mesmo padrão dos módulos existentes
- **`ci-workflow-generator`** — gera `.github/workflows/ci.yml`: push + PR em main, Node matrix [20, 22], npm cache, steps build/test condicionais ao `package.json`
- **`release-workflow-generator`** — gera `.github/workflows/release.yml`: tag `v*`, Node 20 LTS, registry-url npm, `npm publish --dry-run` por padrão (seguro sem configuração)
- `workflow-types.ts` — tipos TypeScript de objetos GitHub Actions (zero string concatenation)
- `builders/workflow.ts` — step builders tipados + `serializeWorkflow()` via pacote `yaml`
- **`yaml` package** (eemeli/yaml v2) adicionado como dependência — serialização determinística de YAML
- `renderCicd()` no `TerminalRenderer` — workflows aparecem no output principal do `deploy`
- `examples/generated-workflows/ci.yml` e `release.yml` — exemplos reais gerados
- `docs/cicd.md` — documentação completa do módulo

### Melhorado

- `deploy`, `execute`, `runtime` e `remote` CLI — incluem fase cicd automaticamente
- `TerminalRenderer` — timestamps ISO removidos do output interativo (ficam disponíveis em `--verbose`)
- README — seção GitHub Actions com exemplos reais, pipeline e filosofia safe-by-default
- `docs/development.md` — seção de filosofia de snapshots e cross-platform guarantees
- Todos os metadados `your-org` corrigidos com URL real do repositório

### Testes

- 257 testes (Vitest) — 17 arquivos de teste
- 3 snapshots novos em `test/snapshots/cicd.snap` (workflows YAML verbatim)

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
- 233 testes (Vitest) — integração, snapshots, TUI, packaging (257 na v0.2.0)
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

- **v0.4.0** — Supabase CLI integration (migrations automáticas)
- **v0.5.0** — Hostinger VPS deploy integration
- **v1.0.0** — API estável, full feature parity
