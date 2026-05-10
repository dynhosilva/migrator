# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Visão do projeto

`lovable-migrate` é uma **engine de migração** para projetos exportados do [Lovable.dev](https://lovable.dev). O objetivo é automatizar a migração de projetos Lovable para ambientes self-hosted, cobrindo análise, planejamento, transformação de código, deploy e re-sincronização.

## Roadmap de fases (em ordem)

| Fase | Módulo | Responsabilidade |
|---|---|---|
| ✅ Analyze | `src/analyzer/` | Detecta stack, framework, Supabase, rotas, env vars |
| ✅ Plan | `src/planner/` | Gera `MigrationPlan` a partir do `AnalysisReport` via registry de strategies |
| ✅ Validate | `src/validator/` | Valida plano e análise — bloqueia migrações inseguras ou incompletas |
| ✅ Migrate v1 | `src/migrator/` | Gera artefatos filesystem (env, migrations, instruções, relatório) |
| ✅ Deploy v1 | `src/deploy/` | Gera artefatos Docker (Dockerfile, docker-compose.yml, .dockerignore) |
| ✅ Execute v1 | `src/executor/` | Verifica ambiente + valida artefatos + gera plano de execução e dry-run |
| ✅ Runtime v1 | `src/runtime/` | Execução local real: install, build, docker build + logs estruturados |
| ✅ Remote v1 | `src/remote/` | Planejamento de deploy remoto — modelagem pura, sem SSH real |
| 🔲 Re-sync | `src/sync/` | Re-sincronização com Lovable / Supabase |

Integrações externas planejadas: **Supabase** (migrations, auth, edge functions) e **Hostinger** (deploy de VPS).

## Commands

```bash
npm run build        # compila TypeScript → dist/
npm run dev          # executa CLI via ts-node (sem build)
npm run typecheck    # verifica tipos sem emitir arquivos
npm start            # executa o build compilado
```

Não há test runner nem linter configurado.

Ao passar argumentos para o CLI via `npm run dev`, use `--` para separar flags do npm das flags da CLI:

```bash
# Via ts-node (desenvolvimento)
npm run dev -- inspect <input> [-v|--verbose]
npm run dev -- analyze <input> [-v|--verbose] [-f|--format terminal|json]
npm run dev -- plan    <input> [-v|--verbose] [-f|--format terminal|json]
npm run dev -- validate <input> [-v|--verbose] [-f|--format terminal|json]
npm run dev -- migrate <input> [-v|--verbose] [-f|--format terminal|json] [-o|--output <dir>] [--force]

# Via build compilado
npm start migrate <input> --output ./output/meu-projeto

# Após instalação global
npm install -g .
lovable-migrate migrate /path/to/project -o ./output/meu-projeto
```

`--output` define o diretório de saída (padrão: `./output/<nome-do-projeto>`). Todos os artefatos gerados vão para esse diretório — o projeto original nunca é modificado.

`<input>` aceita: pasta local, arquivo `.zip`, ou diretório com `.git`.

## Arquitetura

### Pipeline central

```
resolveSource(input)
  → source.load()     → ProjectFile[]
  → createContext()   → ProjectContext            (src/core/)
  → analyzeContext()  → ProjectContext + analysis (src/analyzer/)
  → planContext()     → ProjectContext + plan     (src/planner/)
  → validateContext()  → ProjectContext + validation (src/validator/)
  → migrateContext()   → ProjectContext + migration (src/migrator/)
  → deployContext()    → ProjectContext + deploy    (src/deploy/)
  → executeContext()   → ProjectContext + execution (src/executor/)
  → runContext()       → ProjectContext + runtime   (src/runtime/)
  → prepareContext()   → ProjectContext + remote    (src/remote/)
  → renderer.render()                              (src/output/)
```

`ProjectContext` (`src/core/types.ts`) é a espinha dorsal imutável do pipeline. Cada fase recebe o contexto e retorna uma nova versão via spread com seu campo preenchido. **Nunca mutar o contexto — sempre criar novo via `{ ...ctx, novocampo }`**.

Campos futuros já reservados na interface (comentados):
```typescript
// readonly plan?: MigrationPlan;
// readonly migration?: MigrationResult;
// readonly deploy?: DeployState;
```

### Módulos

| Módulo | Responsabilidade |
|---|---|
| `src/core/` | `ProjectContext`, `createContext`, `withAnalysis`, `withPlan`, `withValidation`, `withMigration` |
| `src/sources/` | Leitura de fontes: `LocalFolderSource`, `ZipSource`, `GitHubSource`. `resolveSource()` detecta o tipo automaticamente |
| `src/analyzer/` | Análise via `DetectorRegistry` com 10 detectores especializados |
| `src/planner/` | Planejamento via `PlannerRegistry` com 7 strategies independentes |
| `src/validator/` | Validação via `ValidationRegistry` com 7 rules independentes |
| `src/migrator/` | Migração filesystem via `MigratorRegistry` com 6 tasks geradoras |
| `src/output/` | Renderização desacoplada: interface `Renderer`, `TerminalRenderer`, `JsonRenderer` |
| `src/logger/` | Logger com níveis `debug/info/warn/error` e flag verbose |

### Sources e arquivos ignorados

`resolveSource()` despacha para a fonte correta com base no input: presença de `.git` → `GitHubSource`; extensão `.zip` → `ZipSource`; pasta sem `.git` → `LocalFolderSource`. `GitHubSource` lê repositórios já clonados localmente — clone automático via API não está implementado.

Os padrões definidos em `src/sources/ignore.ts` (`DEFAULT_IGNORE`) excluem automaticamente durante o carregamento: `node_modules`, `dist`, `.git`, `*.log`, `.next`, `coverage`, `test`, `teste`, `examples`, `fixtures` e outros artefatos de build. Ao escrever detectores, assuma que esses diretórios nunca aparecem em `ProjectFile[]`.

`ProjectFile.relativePath` é sempre normalizado para barras `/` (forward slashes), mesmo no Windows. Nunca use `path.sep` para comparar caminhos em detectores — use `/` diretamente.

### Detector Registry (`src/analyzer/registry.ts`)

Detectores são registrados em `src/analyzer/index.ts`. A ordem de registro define a ordem de execução — detectores dependentes leem `ctx.partial` para acessar resultados anteriores. O registry acumula resultados via `reduce`, produzindo a cada passo um novo `Partial<AnalysisReport>` sem mutação.

Ordem de registro atual (e dependências):
1. `language` — sem dependências
2. `framework` — sem dependências
3. `buildSystem` — sem dependências
4. `packageManager` — sem dependências
5. `tailwind` — sem dependências
6. `supabase` — sem dependências
7. `lovable` — sem dependências
8. `envVars` — sem dependências
9. `routes` — depende de `partial.framework`
10. `criticalFiles` — sem dependências

```typescript
// Exemplo: routes depende de framework — registrado depois
registry
  .register({ key: 'framework', detect: ({ files, packageJson }) => detectFramework(files, packageJson) })
  .register({ key: 'routes',    detect: ({ files, partial })     => detectRoutes(files, partial.framework ?? 'unknown') })
```

Para adicionar um novo detector: criar arquivo em `detectors/`, registrar no registry — sem mais alterações.

`packageJson` é pré-condição extraída antes do registry e passada como input explícito a todos os detectores — não é um campo detectado. Isso evita que detectores precisem re-parsear `package.json` e garante uma única fonte de verdade.

### Planner Registry (`src/planner/registry.ts`)

O planner segue o **mesmo padrão** do analyzer, mas opera sobre `AnalysisReport` em vez de `ProjectFile[]`. O `PlannerRegistry` executa strategies em sequência, acumulando resultados em `Partial<MigrationPlan>`.

Cada strategy implementa `Strategy<K>` com `plan(ctx: StrategyContext): MigrationPlan[K]`. O `StrategyContext` expõe `analysis` (o relatório completo) e `partial` (resultados já computados pelas strategies anteriores).

Ordem de registro atual (e dependências):
1. `compatibility` — sem dependências (avalia canDeployStatic, canDeployServer, confidence)
2. `infrastructure` — sem dependências (requiresSupabase, requiresNodeServer, etc.)
3. `env` — sem dependências (classifica envVars em required/optional/missing)
4. `supabase` — sem dependências (manualSteps e warnings específicos do Supabase)
5. `deployStrategy` — depende de `partial.compatibility` e `partial.infrastructure`
6. `risks` — depende de `partial.compatibility`, `.infrastructure`, `.env`, `.supabase`
7. `checklist` — depende de `partial.risks`, `.supabase`, `.env`, `.deployStrategy`, `.infrastructure`

O `MigrationPlan` final é montado por `planProject()` em `src/planner/index.ts`, que adiciona `projectName`, `warnings` (agregados das strategies) e `plannedAt` ao resultado do registry.

**Postura conservadora:** todas as strategies nunca assumem suporte automaticamente — usam `confidence: 'unknown'` quando não há dados suficientes, listam todos os `envVars` detectados como `required` e `missing`, e geram warnings explícitos para casos incompletos.

Para adicionar nova strategy: criar arquivo em `strategies/`, registrar no registry na posição correta (respeitando dependências de `partial`).

### Migrator Registry (`src/migrator/registry.ts`)

O migrator segue o mesmo padrão do planner, mas o `TaskContext` expõe o `ProjectContext` completo (não apenas `analysis`) porque tasks como `migrationExporter` precisam ler `ctx.files` para copiar os arquivos SQL.

**Separação crítica de responsabilidades:**
- Tasks (`src/migrator/tasks/`) → **puras**: recebem contexto, retornam `GeneratedFile[]`. Zero I/O.
- Writer (`src/migrator/writer.ts`) → **única camada com I/O**: valida que todos os paths ficam dentro do `outputDir` antes de escrever.

Ordem de registro (e dependências):
1. `env` — sem deps (gera `.env.example` e `.env.production.example`)
2. `migrations` — sem deps (copia SQL de `ctx.files`)
3. `edgeFunctions` — sem deps (copia funções de `ctx.files`, pula binários)
4. `deployInstructions` — sem deps (gera Markdown com comandos por deploy strategy)
5. `folderReadmes` — sem deps (gera README.md por pasta, condicional ao Supabase)
6. `report` — depende de todos acima via `partial` (conta arquivos, agrega warnings/pendências)

**Estrutura de saída gerada:**
```
output/<project>/
├── README.md
├── env/
│   ├── .env.example
│   ├── .env.production.example
│   └── README.md
├── supabase/               ← somente se Supabase detectado
│   ├── migrations/*.sql    ← copiadas de ctx.files
│   ├── functions/<name>/   ← copiadas de ctx.files
│   └── README.md
├── deploy/
│   ├── deploy-instructions.md
│   └── README.md
└── reports/
    ├── migration-summary.json
    └── README.md
```

**`migrateProject(ctx, outputDir)`** orquestra o pipeline em 3 etapas: (1) `registry.run(ctx)` — puro, sem I/O; (2) `collectAllFiles(partial)` — agrega todos os `GeneratedFile[]`; (3) `writeGeneratedFiles(outputDir, files)` — única escrita em disco.

### Limites de segurança do Migrator v1

**O que o migrator v1 NUNCA faz:**
- Modificar qualquer arquivo do projeto original
- Escrever fora do `outputDir` (verificado em `writer.ts` por path resolution)
- Executar SQL, migrations ou comandos shell
- Fazer login em APIs externas (Supabase, GitHub, Hostinger)
- Criar recursos externos (projetos, buckets, instâncias)
- Overwrite ou deletar arquivos fora do `outputDir`

**O que o migrator v1 faz:**
- Gerar templates de configuração (`.env.example`)
- Copiar artefatos encontrados em `ctx.files` (SQL, Edge Functions)
- Gerar documentação de deploy (Markdown com comandos prontos)
- Gerar relatório de migração (`migration-summary.json`)

### Responsabilidades futuras do Migrator v2

O `MigrationResult` foi projetado como contrato para versões futuras:
- `migrations.files` → migrator v2 pode **executar** o SQL com Supabase CLI
- `edgeFunctions.files` → migrator v2 pode **deployar** as Edge Functions automaticamente
- `report.pendingManualSteps` → UI pode apresentar lista de ações do usuário
- `report.checklist[].done: false` → migrator v2 pode marcar itens como concluídos ao executar
- `deployInstructions.files` → base para geração de scripts shell/CI executáveis

### Deploy Registry (`src/deploy/registry.ts`)

O deployer segue o mesmo padrão do migrator. O `DeployerRegistry` executa tasks em sequência, acumulando `Partial<DeployState>`.

**Tasks registradas (em ordem de execução):**

| Key | Responsabilidade |
|---|---|
| `docker` | Gera todos os artefatos Docker: `Dockerfile`, `docker-compose.yml`, `.dockerignore`, `docker/README.md` |
| `report` | Gera `docker/deploy-report.json` — depende de `partial.docker` |

**Estrutura de saída gerada** (dentro do mesmo `outputDir` do migrator):
```
output/<project>/
└── docker/
    ├── Dockerfile
    ├── docker-compose.yml
    ├── .dockerignore
    ├── README.md
    └── deploy-report.json
```

**Geração do Dockerfile por estratégia de deploy:**
- `static` (React/Vue/Svelte + Vite/CRA): multi-estágio `node:18-alpine` → `nginx:alpine`, serve `dist/` ou `build/` na porta 80
- `node-server` (Next.js): multi-estágio 3-fases deps/builder/runner com `node:18-alpine`, porta 3000
- `docker` / `unknown`: multi-estágio genérico `node:18-alpine`, porta 3000

O Dockerfile adapta os comandos de instalação e build ao package manager detectado (`npm`, `yarn`, `pnpm`, `bun`).

**`deployProject(ctx, outputDir)`** — executa registry (puro) → coleta arquivos → escreve via `writeGeneratedFiles` (mesmo writer do migrator).
**`deployContext(ctx, outputDir)`** — enriquece `ProjectContext` com `DeployState` via `withDeploy`.

O `deploy` command executa o pipeline completo: analyze → plan → validate → migrate → deploy.

**O que o Deploy v1 NUNCA faz:**
- Executar `docker build` ou `docker push`
- Fazer login em registries (Docker Hub, GHCR, etc.)
- Publicar imagens ou fazer deploy em produção
- Modificar arquivos do projeto original

**O que o Deploy v1 faz:**
- Gerar `Dockerfile` multi-estágio otimizado para o framework detectado
- Gerar `docker-compose.yml` com porta e env_file corretos
- Gerar `.dockerignore` com exclusões adequadas ao framework
- Gerar `docker/README.md` com instruções de uso

Para adicionar nova task: criar arquivo em `tasks/`, registrar no registry em `index.ts`. Sem mais alterações.

### Validator Registry (`src/validator/registry.ts`)

O validator segue o mesmo padrão de registry, mas com `ValidationRule` em vez de `Strategy`/`MigrationTask`. Cada rule recebe o `ProjectContext` completo (com `analysis` e `plan` preenchidos) e retorna `ValidationIssue[]`.

**Severidades:**
- `critical` — marca `safeToMigrate = false` e bloqueia o `migrate` command (a menos que `--force` seja usado)
- `warning` — problema real que requer atenção mas não bloqueia automaticamente
- `info` — contexto relevante que o usuário deve estar ciente

**Rules registradas (em ordem de execução):**

| Key | Arquivo | Issues produzidos |
|---|---|---|
| `filesystem` | `rules/filesystem.ts` | `PATH_TRAVERSAL_DETECTED` (critical), `PACKAGE_JSON_MISSING` (critical), `NO_ENTRY_POINT` (warning) |
| `framework` | `rules/framework.ts` | `FRAMEWORK_UNKNOWN` (critical), `FRAMEWORK_UNSUPPORTED` (warning) |
| `build-system` | `rules/build-system.ts` | `BUILD_SYSTEM_UNKNOWN` (warning) |
| `env` | `rules/env.ts` | `ENV_VARS_UNRESOLVED` (critical), `ENV_VARS_NONE_DETECTED` (info), `ENV_WARNING` (warning) |
| `deploy-compatibility` | `rules/deploy-compatibility.ts` | `DEPLOY_STRATEGY_UNKNOWN` (critical), `NEXT_STATIC_INCOMPATIBLE` (critical), `DEPLOY_CONFIDENCE_LOW` (warning), `DEPLOY_CONFIDENCE_MEDIUM` (info) |
| `supabase` | `rules/supabase.ts` | `EDGE_FUNCTIONS_WITHOUT_SUPABASE` (warning), `EDGE_FUNCTIONS_MANUAL_DEPLOY` (warning), `SUPABASE_AUTH_UNCONFIGURED` (info), `SUPABASE_STORAGE_MANUAL` (info) |
| `migration-safety` | `rules/migration-safety.ts` | `MIGRATIONS_REQUIRE_STAGING` (warning), `MIGRATIONS_ORDER_UNVERIFIED` (info) |

**`validateProject(ctx)`** — retorna `ValidationResult` puro (sem I/O, sem efeitos).
**`validateContext(ctx)`** — chama `validateProject`, retorna novo `ProjectContext` com `validation` preenchido via `withValidation`.

O `migrate` command bloqueia se `safeToMigrate === false`. Use `--force` para prosseguir mesmo assim (útil para projetos reais onde as env vars ainda não estão configuradas mas o migrator precisa gerar os artefatos).

O `validate` command retorna exit code 1 se `safeToMigrate === false` — permite uso em pipelines CI/CD.

Para adicionar nova rule: criar arquivo em `rules/`, registrar no registry em `index.ts`. Sem mais alterações.

### Executor Registry (`src/executor/registry.ts`)

O executor segue o mesmo padrão dos outros registries, mas o `ExecutorTaskContext` expõe `ctx`, `partial` **e `outputDir`** — porque tasks como `validateDockerArtifacts` precisam verificar a existência de arquivos no disco.

**Filosofia do executor v1:**
- Nunca executa builds, `docker run`, ou qualquer comando que modifique estado
- Sondas de ambiente (`node --version`, `docker --version`) são somente leitura
- Toda escrita é restrita ao `outputDir/execution/`
- Gera artefatos de planejamento, não executáveis

**Tasks registradas (em ordem de execução):**

| Key | Arquivo | Responsabilidade |
|---|---|---|
| `dockerCheck` | `tasks/docker-artifact-validator.ts` | Verifica se arquivos Docker existem em outputDir |
| `buildCheck` | `tasks/build-command-validator.ts` | Lê scripts do package.json via ctx.analysis |
| `envCheck` | `tasks/environment-checker.ts` | Sonda node/docker/PM via execSync (somente leitura) |
| `runtimeCheck` | `tasks/runtime-compatibility-checker.ts` | Valida versão do Node (depende de partial.envCheck) |
| `plan` | `tasks/execution-plan-generator.ts` | Gera execution-plan.json com passos ordenados |
| `summary` | `tasks/summary-builder.ts` | Agrega todos os issues → `readiness` final |
| `dryRun` | `tasks/dry-run-generator.ts` | Gera dry-run.md com preview legível |

**`ExecutionReadiness`:** `'ready'` | `'ready-with-warnings'` | `'blocked'`

**`ExecutionIssueSeverity`:** `'blocker'` (bloqueia) | `'warning'` | `'info'`

**Estrutura de saída gerada:**
```
output/<project>/
└── execution/
    ├── execution-plan.json   ← passos ordenados de build + deploy
    └── dry-run.md            ← preview humano do que seria executado
```

Para adicionar nova task: criar arquivo em `tasks/`, registrar no registry em `index.ts`. Sem mais alterações.

### Runtime Registry (`src/runtime/registry.ts`)

O runtime é a única fase **assíncrona** do pipeline — o `RuntimeRegistry.run()` usa `await` sequencial em cada task porque as tasks invocam processos reais (`npm install`, `npm run build`, `docker build`).

**Filosofia do runtime v1:**
- Apenas execução LOCAL e controlada — sem SSH, sem VPS, sem cloud
- Toda execução passa pelo `sandbox.ts` (whitelist de executáveis + `shell: false`)
- `shell: false` no `spawn` = injeção por args é impossível ao nível do SO
- Toda escrita é restrita ao `outputDir/runtime/`
- Execução observável: cada comando retorna `CommandResult` com stdout, stderr, durationMs, timedOut

**`sandbox.ts` — whitelist e proteção:**

Executáveis permitidos: `node`, `npm`, `npx`, `pnpm`, `yarn`, `bun`, `docker`

Bloqueados implicitamente (não na whitelist): `rm`, `del`, `format`, `shutdown`, `reboot`, `bash`, `powershell`, `sh`, `cmd` e qualquer outro.

**`process.ts` — execução de baixo nível:**

Usa `spawn` com `shell: false`. Captura stdout/stderr com limite de 4096 bytes. Mata o processo com `SIGTERM` ao atingir o timeout. Sempre retorna `CommandResult` (nunca joga exceção para erros de processo).

**`projectDir` vs `outputDir`:**
- `projectDir`: diretório do projeto fonte onde `npm install` e `npm run build` rodam
- `outputDir`: artefatos gerados (migrate, deploy, execute) — o Dockerfile fica em `outputDir/docker/`
- O `docker build` usa `--file outputDir/docker/Dockerfile` com contexto de `projectDir`

**Tasks registradas (em ordem de execução):**

| Key | Arquivo | Responsabilidade |
|---|---|---|
| `install` | `tasks/npm-install-runner.ts` | Executa npm/pnpm/yarn/bun install em projectDir |
| `build` | `tasks/build-runner.ts` | Executa npm run build, valida artefatos gerados |
| `dockerBuild` | `tasks/docker-build-runner.ts` | Executa docker build com Dockerfile do outputDir |
| `artifacts` | `tasks/artifact-validator.ts` | Valida existência de dist/, Dockerfile, .env.example, etc. |
| `log` | `tasks/runtime-logger.ts` | Gera runtime/runtime-log.json com CommandResults |
| `summary` | `tasks/execution-summary.ts` | Gera runtime/runtime-summary.md com status legível |

**`RuntimeReadiness`:** `'success'` | `'partial'` | `'failed'`

**`RuntimeIssueSeverity`:** `'blocker'` | `'warning'` | `'info'`

**Estrutura de saída gerada:**
```
output/<project>/
└── runtime/
    ├── runtime-log.json   ← CommandResults estruturados (task, exitCode, durationMs, etc.)
    └── runtime-summary.md ← Sumário legível com próximos passos
```

**`runProject(ctx, outputDir, projectDir?)`** — executa registry (async) → coleta arquivos → escreve → computa readiness.
**`runContext(ctx, outputDir, projectDir?)`** — enriquece `ProjectContext` com `RuntimeState` via `withRuntime`.

`projectDir` tem default `ctx.source.inputPath`. Em testes, passar cópia do fixture para não poluir os fixtures originais.

Para adicionar nova task: criar arquivo em `tasks/`, registrar no registry em `index.ts`. Sem mais alterações.

### Remote Registry (`src/remote/registry.ts`)

O remote segue o mesmo padrão de registry, mas é **síncrono** (igual ao migrator/deploy/executor) — todas as tasks são pure modeling/planning sem I/O de rede.

O `RemoteTaskContext` expõe `ctx`, `partial`, `outputDir` **e `config`** (`RemoteConfig`) — porque tasks como o `remote-execution-planner` precisam dos dados SSH e do caminho remoto.

**Filosofia do remote v1:**
- Nunca abre conexões SSH reais
- Nunca executa comandos remotos ou deploya em produção
- Nunca modifica arquivos do projeto original
- Toda modelagem é baseada em `HostProfile` (simulado) e `SshConfig` (formato-only)

**Modelos-chave:**

- `HostProfile` — perfil simulado do host remoto (OS, Node.js, Docker, portas, disco). `DEFAULT_HOST_PROFILE`: Ubuntu 22.04, Docker disponível, Node v20, disco 20GB.
- `SshConfig` — configuração SSH (host, porta, usuário, keyPath, authStrategy). Validação de **formato apenas** — sem conexão real.
- `RemoteConfig` — config interna resolvida (sshConfig + hostProfile + remotePath) — separada da `RemoteOptions` do usuário.

**Tasks registradas (em ordem de execução):**

| Key | Arquivo | Responsabilidade |
|---|---|---|
| `hostCheck` | `tasks/host-compatibility-checker.ts` | Valida OS, Node ≥ 18, Docker, porta, disco ≥ 2GB |
| `sshCheck` | `tasks/ssh-config-validator.ts` | Valida formato SSH (hostname, porta, usuário, keyPath) |
| `transferPlan` | `tasks/transfer-planner.ts` | Lista arquivos a transferir com tamanhos estimados |
| `deploymentCheck` | `tasks/deployment-strategy-checker.ts` | Valida estratégia vs. capacidades do host |
| `executionPlan` | `tasks/remote-execution-planner.ts` | Gera remote-execution-plan.json com 5 passos ordenados |
| `dryRun` | `tasks/remote-dry-run-generator.ts` | Gera remote-dry-run.md (preview humano) |
| `summary` | `tasks/remote-summary-builder.ts` | Gera remote-summary.md com status e próximos passos |

**`RemoteReadiness`:** `'ready'` | `'ready-with-warnings'` | `'blocked'`

**`RemoteIssueSeverity`:** `'blocker'` | `'warning'` | `'info'`

**Passos do execution plan (fixos, sempre gerados):**
1. `create-remote-dirs` (remoto, risco baixo) — `mkdir -p` no servidor
2. `transfer-files` (local, risco médio) — `rsync` dos artefatos
3. `docker-build-remote` (remoto, risco médio) — `docker build` no servidor
4. `docker-compose-up` (remoto, risco alto) — `docker compose up -d`
5. `verify-health` (remoto, risco baixo) — `curl` no localhost

**Estrutura de saída gerada:**
```
output/<project>/
└── remote/
    ├── remote-execution-plan.json  ← passos ordenados com comandos SSH reais
    ├── remote-dry-run.md           ← preview legível sem execução
    └── remote-summary.md           ← status e próximos passos
```

**`prepareRemote(ctx, outputDir, options?)`** — executa registry (puro) → coleta arquivos → escreve → computa readiness.
**`prepareContext(ctx, outputDir, options?)`** — enriquece `ProjectContext` com `RemoteState` via `withRemote`.

`RemoteOptions` aceita: `sshConfig`, `hostProfile`, `remotePath`. Defaults usados quando não fornecido.

**O que o Remote v1 NUNCA faz:**
- Abrir SSH real ou executar comandos remotos
- Subir containers ou fazer deploy em produção
- Modificar arquivos do projeto original
- Testar conectividade real (ping, handshake, etc.)

**O que o Remote v1 faz:**
- Validar perfil do host (baseado em dados fornecidos/padrão)
- Validar formato da configuração SSH
- Planejar lista de arquivos a transferir
- Gerar plano de execução com comandos SSH prontos
- Gerar preview do deploy para revisão humana

Para adicionar nova task: criar arquivo em `tasks/`, registrar no registry em `index.ts`. Sem mais alterações.

### Fluxo planner → validator → migrator

O `ValidationResult` é o contrato entre o validator e o migrator:
- `checklist` → lista de tarefas que o migrator/deploy pode executar automaticamente
- `deployStrategy.recommended` → informa ao migrator qual template/estratégia usar
- `infrastructure` → informa ao deploy quais recursos provisionar
- `supabase.manualSteps` → itens que não podem ser automatizados (requerem CLI ou dashboard)
- `risks` → complementado e refinado pelo validator antes de chegar ao migrator

O `ValidationResult` expõe:
- `safeToMigrate` → gate de segurança — false bloqueia o migrator por padrão
- `blockingIssues` → issues críticos com `code`, `rule`, `message`, `suggestion`
- `warnings` / `infos` → visíveis no relatório mas não bloqueantes
- `summary.rulesExecuted` → auditabilidade — quantas rules foram avaliadas

### Output / Renderers

O `analyzer` não depende de `chalk` nem de nenhum renderer concreto. Para adicionar novo formato:

```typescript
export class MeuRenderer implements Renderer {
  render(ctx: ProjectContext): void { /* ctx.analysis contém o relatório */ }
}
```

## Como implementar uma nova fase do pipeline

Toda nova fase (migrator, deploy, sync) segue este padrão obrigatório:

1. Criar `src/<fase>/types.ts` — definir o tipo de output da fase (ex: `MigrationPlan`)
2. Adicionar campo `readonly` na interface `ProjectContext` em `src/core/types.ts` (ex: `readonly plan?: MigrationPlan`)
3. Criar `src/<fase>/index.ts` — função que recebe `ProjectContext` e retorna `withX(ctx, resultado)`
4. Adicionar `withX` em `src/core/index.ts` seguindo o padrão de `withAnalysis`
5. Registrar a fase no pipeline em `src/cli.ts`
6. Exportar tipos e funções em `src/index.ts`

**Regras invioláveis de qualquer fase:**
- Toda fase é uma função pura: mesmo input → mesmo output, sem efeitos colaterais ocultos
- Toda fase recebe `ProjectContext` e retorna **novo** `ProjectContext` via spread — nunca mutar diretamente
- Toda fase tem seu próprio `types.ts` — nunca misturar tipos de fases diferentes
- Dependências circulares entre módulos são proibidas — o grafo de dependências deve ser um DAG

**Regras de integração externa:**
- Novas integrações (Supabase, Hostinger, GitHub API) ficam em `src/integrations/<nome>/`
- Integrações são chamadas pelas fases, nunca chamam fases diretamente

## Decisões arquiteturais estabelecidas

- **Contexto imutável**: fases do pipeline nunca mutam `ProjectContext`, sempre retornam novo objeto via spread.
- **Registry dinâmico**: novos detectores/strategies não requerem alteração no orquestrador, apenas registro.
- **Renderização desacoplada**: analyzer e planner não conhecem `chalk`, terminal ou JSON. Toda apresentação passa pela interface `Renderer`.
- **`packageJson` fora do registry**: extraído uma vez antes do registry e passado como input — não é campo detectado.
- **Planner é conservador por design**: nunca assume suporte automaticamente; prefere `confidence: 'unknown'` e warnings explícitos a falsos positivos.
- **Migrator v1 é filesystem-only**: tasks são puras (sem I/O), writer é a única camada que toca disco, outputDir nunca é o projeto original.

## Convenções

- TypeScript strict mode obrigatório — sem `any` exceto em casts controlados e documentados no registry.
- Compilação targeting ES2020 com `module: commonjs` — não usar sintaxe ESM (`import()` dinâmico, top-level await) que não seja suportada pelo target.
- Toda comunicação com o usuário (logs, relatórios) em **português do Brasil**.
- Código, nomes de variáveis, funções, tipos e comentários técnicos em **inglês**.
- Backward compatibility: `printReport(report)` e `analyzeProject(files, name)` permanecem funcionais. Novo código usa `analyzeContext(ctx)` e `renderer.render(ctx)`.
- **Composição sobre herança** — preferir interfaces e funções compostas a hierarquias de classes.
- **Detectores independentes** — cada detector em `src/analyzer/detectors/` não deve importar de outro detector. Dependências entre resultados passam por `ctx.partial`, nunca por import direto.
- **Renderers sem lógica de negócio** — implementações de `Renderer` em `src/output/` só formatam e exibem. Decisões sobre o que mostrar pertencem ao domínio, não ao renderer.

## Issues conhecidas / TODOs técnicos

### Self-analysis contamination no detector de rotas

**Arquivo:** `src/analyzer/detectors/routes.ts`

**Problema:** o detector usa regex para encontrar padrões de rota (`/path`, `<Route path=...`) no código-fonte. Ao analisar o próprio repositório da engine, detecta padrões dentro do seu próprio código como se fossem rotas da aplicação.

**Evidência:** `npm run dev -- analyze .` retorna `/` e `/rota` como rotas detectadas, ambas apontando para `src/analyzer/detectors/routes.ts`.

**Soluções candidatas (não implementadas):**
- Restringir a detecção apenas a arquivos de app conhecidos (`src/App.tsx`, `src/main.tsx`, `pages/`, `app/`)
- Ignorar arquivos dentro de `src/analyzer/` durante a detecção de rotas
- Substituir regex por AST parsing para maior precisão
- Limitar detecção apenas quando framework é conhecido (não `unknown`)

**Impacto atual:** baixo — só afeta análise do próprio workspace da engine. Projetos Lovable reais não têm esse problema.

## Infraestrutura de testes

**Runner:** Vitest. Scripts disponíveis:
```bash
npm test               # executa todos os testes (CI)
npm run test:watch     # modo interativo (desenvolvimento)
npm run test:snapshots # atualiza snapshots após mudança intencional de output
npm run typecheck:test # type-check dos arquivos de teste (exclui fixtures)
```

### Estrutura

```
test/
├── fixtures/              # Projetos-exemplo estáticos (somente leitura nos testes)
│   ├── react-vite/        # React + Vite + npm + env vars (framework bem detectado)
│   ├── minimal-js/        # JS mínimo, framework unknown (testa validação crítica)
│   ├── broken-project/    # Sem package.json (testa PACKAGE_JSON_MISSING)
│   └── supabase-project/  # React + Vite + Supabase + migrations + edge function
├── helpers/
│   ├── normalize.ts       # normalizeOutput(), normalizeTimestamps(), normalizePaths()
│   └── pipeline.ts        # loadFixture(), runAnalysis(), runValidation(), runPipeline()
├── integration/           # Testes de integração do pipeline
│   ├── pipeline.test.ts   # Pipeline completo end-to-end (5 asserts por fixture)
│   ├── analysis.test.ts   # AnalysisReport + snapshots por fixture
│   ├── validator.test.ts  # Comportamento de bloqueio e classificação de issues
│   ├── migration.test.ts  # MigrationResult + migration-summary.json snapshot
│   └── deploy.test.ts     # Dockerfile, docker-compose, .dockerignore + snapshots
└── snapshots/             # Snapshots centralizados (gerenciados pelo Vitest)
    ├── analysis.snap
    ├── deploy.snap
    └── migration.snap
```

### Filosofia de snapshots

Snapshots protegem saídas textuais determinísticas contra regressão silenciosa. Antes de snapshottar, todo output passa por `normalizeOutput()` que remove:
- **Timestamps ISO** (`detectedAt`, `generatedAt`, etc.) → `<TIMESTAMP>`
- **Paths absolutos** do fixture dir → `<FIXTURE_DIR>`
- **Paths absolutos** do output dir → `<OUTPUT_DIR>`
- **Separadores Windows** (backslash → forward slash)

Isso garante que os snapshots sejam **multiplataforma** e **determinísticos entre execuções**.

Conteúdo de arquivos gerados (Dockerfile, docker-compose.yml, .dockerignore) não contém timestamps nem paths, portanto é snapshot sem normalização.

### Regras de testes

- **Fixtures são somente leitura** — nenhum teste escreve em `test/fixtures/`
- **Output sempre em `os.tmpdir()`** — usando `makeTempDir()` + `removeTempDir()` em `afterAll`
- **Sem internet** — nenhum teste faz chamada de rede ou API externa
- **Sem Docker instalado** — testes validam conteúdo dos artefatos, não execução
- **Sem side effects globais** — cada suite de teste é independente

### Fixtures — contrato mínimo

| Fixture | Framework | package.json | Env vars | Supabase |
|---|---|---|---|---|
| `react-vite` | react + vite | ✓ | VITE_API_URL, VITE_APP_TITLE | ✗ |
| `minimal-js` | unknown | ✓ | APP_GREETING | ✗ |
| `broken-project` | unknown | ✗ | — | ✗ |
| `supabase-project` | react + vite | ✓ | VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY | ✓ (1 migration, 1 edge fn) |

Para adicionar novo fixture: criar diretório em `test/fixtures/`, não adicionar a `.gitignore`.
Para adicionar novo teste de snapshot: usar `normalizeOutput()` antes de `toMatchSnapshot()`.

## O que NÃO fazer

- Não passar `ProjectFile[]` diretamente entre módulos de alto nível — usar `ProjectContext`.
- Não adicionar lógica de apresentação (`chalk`, `console.log` formatado) fora de `src/output/`.
- Não implementar migrator, deploy ou sync antes de consolidar as fases atuais.
- Não criar "god objects" flat — novos campos de análise vão em sub-interfaces específicas.
- Não mutar arrays ou objetos do contexto — imutabilidade é invariante do pipeline.
- Não adicionar lógica de negócio em renderers — `src/output/` é camada de apresentação pura.
- Não importar um detector dentro de outro detector — usar `ctx.partial` para dependências de resultado.
- Não criar integrações externas dentro de fases — isolar em `src/integrations/<nome>/`.
- Não usar herança onde composição resolve — preferir `implements Interface` a `extends Classe`.
- Não usar `path.sep` para comparar caminhos em detectores — `ProjectFile.relativePath` usa `/` sempre.
- Não adicionar lógica de negócio em strategies do planner — cada strategy é pura e stateless; state compartilhado passa por `ctx.partial`.
- Não adicionar I/O em tasks do migrator — toda escrita em disco deve ficar em `src/migrator/writer.ts`.
- Não escrever fora do `outputDir` no migrator — `writer.ts` valida por path resolution antes de qualquer escrita.
- Não adicionar correção automática em rules do validator — o validator é somente leitura, classificação e bloqueio de risco; correções ficam no migrator v2 ou deploy.
- Não criar dependências entre rules do validator — cada rule lê `ProjectContext` diretamente; nunca importar uma rule dentro de outra.
- Não executar builds, docker run, ou comandos com efeitos colaterais no executor — tasks do executor são somente leitura; a única escrita permitida é `outputDir/execution/`.
- Não adicionar lógica de execução real no executor v1 — o executor gera planos e verifica pré-condições; execução real fica no executor v2.
- Não usar `exec` ou `execFile` no runtime — usar apenas `spawn` com `shell: false` (definido em `process.ts`); o shell interpreta metacaracteres, `spawn` não.
- Não chamar `runCommand` diretamente nas tasks de runtime — sempre passar por `runSafeCommand` do `sandbox.ts` para garantir validação de whitelist.
- Não adicionar executáveis à whitelist sem revisão explícita — cada adição amplia a superfície de ataque do runtime.
- Não rodar `npm install` no diretório original do fixture em testes — copiar o fixture para um temp dir primeiro (`fs.cpSync`) para manter as fixtures somente-leitura.
