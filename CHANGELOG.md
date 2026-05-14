# Changelog

Todas as mudanças notáveis neste projeto serão documentadas aqui.

O formato segue [Keep a Changelog](https://keepachangelog.com/pt-BR/1.0.0/),
e este projeto adere ao [Versionamento Semântico](https://semver.org/lang/pt-BR/).

---

## [0.3.2] — 2026-05-13

### Fix — nested-root ZIP: exportação de Edge Functions e entry points .jsx

Patch cirúrgico sobre bugs restantes detectados após análise root-cause completa do caso `appsmartfinance-main/`.

### Corrigido

- **`edge-function-exporter.ts` — bug silencioso de exportação** (`src/migrator/tasks/edge-function-exporter.ts`)
  - `startsWith('supabase/functions/<name>/')` retornava FALSE para paths com nested root (`project/supabase/functions/<name>/`)
  - Edge functions eram detectadas corretamente pelo analyzer mas silenciosamente não exportadas pelo migrator
  - Fix: substituído por `startsWith(flat) || includes(nested)` — funciona com qualquer profundidade de prefixo
  - Segundo bug no mesmo arquivo: `replace(/^supabase\/functions\//)` não capturava nested roots → substituído por `replace(/^(?:.*\/)?supabase\/functions\//)`

- **`KNOWN_ENTRY_POINTS` — entry points `.jsx` e `.js` ausentes** (`src/validator/rules/filesystem.ts`)
  - Projetos CRA e React antigos que usam `src/main.jsx` ou `src/index.jsx` recebiam `NO_ENTRY_POINT` falso positivo
  - Adicionados: `src/main.jsx`, `src/main.js`, `src/index.jsx`, `src/index.js`

### Testes

- 282 testes (Vitest) — 19 arquivos de teste
- `test/integration/zip-nested-root.test.ts` — estendido de 5 para 9 testes; cobre agora a fase `migrateContext` completa
  - `exporta edge functions corretamente mesmo com prefixo de pasta no ZIP` — regressão que pegaria o bug silencioso
  - `artefatos de edge function têm paths corretos (sem prefixo do projeto)` — garante output limpo
  - `exporta migrations com paths corretos` — confirma que migration-exporter continua correto
  - `detecta Supabase com migrations e edge functions` — detector smoke test

---

## [0.3.1] — 2026-05-13

### UX — Onboarding e calibração de severidade

Patch focado em redução de ansiedade do primeiro uso: sem falsos bloqueadores, mensagens reassurantes e guia contextual de próximos passos.

### Corrigido

- **`ENV_VARS_UNRESOLVED` demovido de `critical` para `warning`** — variáveis de ambiente detectadas mas não configuradas no servidor destino são o estado *esperado* em projetos novos; o deploy não falhou e `safeToMigrate` não é mais bloqueado por isso

### Melhorado

- **Mensagem `ENV_VARS_UNRESOLVED` redesenhada** — de tom de erro urgente para explicação tranquilizadora: "isso é esperado em projetos novos"
- **Reassurance line** — output terminal exibe `→ O projeto original não será modificado — todos os artefatos vão para --output` antes de cada bloco de análise
- **Bloco "Próximos passos recomendados"** — exibido após análise quando o usuário roda apenas `analyze`; max 4 passos contextuais baseados no projeto (env vars detectadas, Supabase detectado, CTA para `deploy` e `ui`)

### Testes

- 278 testes (Vitest) — 19 arquivos de teste
- `test/integration/zip-nested-root.test.ts` — 5 novos testes que garantem ausência de falsos positivos (`PACKAGE_JSON_MISSING`, `NO_ENTRY_POINT`) em ZIPs exportados do Lovable.dev com prefixo de pasta aninhado
- `test/integration/validator.test.ts` — atualizado: `react-vite` e `supabase-project` não bloqueiam mais por env vars; asserções movem `ENV_VARS_UNRESOLVED` para `warnings`
- `test/integration/server.test.ts` — atualizado: endpoint `/validate` corretamente retorna `safeToMigrate: true` para `react-vite`

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
