# Registries — referência detalhada

Este documento é a referência canônica para ordens de registro, dependências, estruturas de output e contratos de cada fase do pipeline. Consulte ao adicionar detectores, strategies, tasks ou rules.

## Padrão comum

Todos os registries seguem a mesma interface:

```typescript
registry.register({ key: 'nome', detect/plan/run: (ctx) => ... })
```

- Execução sequencial — `ctx.partial` acumula resultados das etapas anteriores
- Dependências expressas por ordem de registro — steps dependentes vêm depois
- Resultado final: `registry.run(ctx)` retorna `Partial<T>` completo

---

## Detector Registry (`src/analyzer/`)

Registrado em `src/analyzer/index.ts`. Recebe `{ files, packageJson, partial }`.

| Ordem | Key | Dependências |
|---|---|---|
| 1 | `language` | — |
| 2 | `framework` | — |
| 3 | `buildSystem` | — |
| 4 | `packageManager` | — |
| 5 | `tailwind` | — |
| 6 | `supabase` | — |
| 7 | `lovable` | — |
| 8 | `envVars` | — |
| 9 | `routes` | `partial.framework` |
| 10 | `criticalFiles` | — |

`packageJson` é pré-extraído e passado como input explícito a todos os detectores — não é campo detectado.

```typescript
registry
  .register({ key: 'framework', detect: ({ files, packageJson }) => detectFramework(files, packageJson) })
  .register({ key: 'routes',    detect: ({ files, partial })     => detectRoutes(files, partial.framework ?? 'unknown') })
```

---

## Planner Registry (`src/planner/`)

Registrado em `src/planner/index.ts`. Cada strategy implementa `Strategy<K>` com `plan(ctx: StrategyContext): MigrationPlan[K]`. O `StrategyContext` expõe `analysis` e `partial`.

| Ordem | Key | Dependências |
|---|---|---|
| 1 | `compatibility` | — |
| 2 | `infrastructure` | — |
| 3 | `env` | — |
| 4 | `supabase` | — |
| 5 | `deployStrategy` | `partial.compatibility`, `partial.infrastructure` |
| 6 | `risks` | `partial.compatibility`, `.infrastructure`, `.env`, `.supabase` |
| 7 | `checklist` | `partial.risks`, `.supabase`, `.env`, `.deployStrategy`, `.infrastructure` |

`planProject()` em `src/planner/index.ts` adiciona `projectName`, `warnings` (agregados das strategies) e `plannedAt` ao resultado.

**Postura conservadora:** `confidence: 'unknown'` quando dados insuficientes; todos os `envVars` detectados listados como `required` e `missing`; warnings explícitos para casos incompletos.

---

## Validator Registry (`src/validator/`)

Registrado em `src/validator/index.ts`. Cada rule recebe `ProjectContext` completo e retorna `ValidationIssue[]`.

**Severidades:**
- `critical` — marca `safeToMigrate = false`, bloqueia `migrate` (superável com `--force`)
- `warning` — requer atenção mas não bloqueia
- `info` — contexto informativo

| Key | Arquivo | Issues produzidos |
|---|---|---|
| `filesystem` | `rules/filesystem.ts` | `PATH_TRAVERSAL_DETECTED` (critical), `PACKAGE_JSON_MISSING` (critical), `NO_ENTRY_POINT` (warning) |
| `framework` | `rules/framework.ts` | `FRAMEWORK_UNKNOWN` (critical), `FRAMEWORK_UNSUPPORTED` (warning) |
| `build-system` | `rules/build-system.ts` | `BUILD_SYSTEM_UNKNOWN` (warning) |
| `env` | `rules/env.ts` | `ENV_VARS_UNRESOLVED` (critical), `ENV_VARS_NONE_DETECTED` (info), `ENV_WARNING` (warning) |
| `deploy-compatibility` | `rules/deploy-compatibility.ts` | `DEPLOY_STRATEGY_UNKNOWN` (critical), `NEXT_STATIC_INCOMPATIBLE` (critical), `DEPLOY_CONFIDENCE_LOW` (warning), `DEPLOY_CONFIDENCE_MEDIUM` (info) |
| `supabase` | `rules/supabase.ts` | `EDGE_FUNCTIONS_WITHOUT_SUPABASE` (warning), `EDGE_FUNCTIONS_MANUAL_DEPLOY` (warning), `SUPABASE_AUTH_UNCONFIGURED` (info), `SUPABASE_STORAGE_MANUAL` (info) |
| `migration-safety` | `rules/migration-safety.ts` | `MIGRATIONS_REQUIRE_STAGING` (warning), `MIGRATIONS_ORDER_UNVERIFIED` (info) |

`validateProject(ctx)` — retorna `ValidationResult` puro (sem I/O).
`validateContext(ctx)` — retorna novo `ProjectContext` com `validation` preenchido.

O `validate` command retorna exit code 1 se `safeToMigrate === false` — utilizável em CI/CD.

---

## Migrator Registry (`src/migrator/`)

Registrado em `src/migrator/index.ts`. `TaskContext` expõe `ProjectContext` completo (incluindo `ctx.files`) porque tasks precisam copiar arquivos SQL.

**Separação crítica:** tasks em `tasks/` são puras (retornam `GeneratedFile[]`, zero I/O); `writer.ts` é a única camada com escrita em disco.

| Ordem | Key | Dependências |
|---|---|---|
| 1 | `env` | — |
| 2 | `migrations` | — |
| 3 | `edgeFunctions` | — |
| 4 | `deployInstructions` | — |
| 5 | `folderReadmes` | — |
| 6 | `report` | todos os anteriores via `partial` |

**Estrutura de output:**

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

`migrateProject(ctx, outputDir)` orquestra em 3 etapas: (1) `registry.run(ctx)` — puro; (2) `collectAllFiles(partial)` — agrega; (3) `writeGeneratedFiles(outputDir, files)` — única escrita.

**O migrator v1 NUNCA:** modifica o projeto original, escreve fora do `outputDir`, executa SQL, faz login em APIs externas, cria recursos externos.

### Responsabilidades futuras (Migrator v2)

O `MigrationResult` é contrato para versões futuras:
- `migrations.files` → migrator v2 pode **executar** SQL com Supabase CLI
- `edgeFunctions.files` → migrator v2 pode **deployar** Edge Functions automaticamente
- `report.pendingManualSteps` → UI apresenta lista de ações para o usuário
- `deployInstructions.files` → base para scripts shell/CI executáveis

---

## Deploy Registry (`src/deploy/`)

Registrado em `src/deploy/index.ts`. Mesmo padrão do migrator.

| Ordem | Key | Dependências |
|---|---|---|
| 1 | `docker` | — |
| 2 | `report` | `partial.docker` |

**Geração do Dockerfile por estratégia:**
- `static` (React/Vue/Svelte + Vite/CRA): multi-stage `node:18-alpine` → `nginx:alpine`, porta 80
- `node-server` (Next.js): multi-stage 3-fases (deps/builder/runner), `node:18-alpine`, porta 3000
- `docker` / `unknown`: multi-stage genérico `node:18-alpine`, porta 3000

Dockerfile adapta comandos de instalação ao package manager detectado (`npm`, `yarn`, `pnpm`, `bun`).

**Estrutura de output:**

```
output/<project>/
└── docker/
    ├── Dockerfile
    ├── docker-compose.yml
    ├── .dockerignore
    ├── README.md
    └── deploy-report.json
```

**O deploy v1 NUNCA:** executa `docker build` ou `docker push`, faz login em registries, publica imagens, modifica o projeto original.

---

## Executor Registry (`src/executor/`)

Registrado em `src/executor/index.ts`. `ExecutorTaskContext` expõe `ctx`, `partial` e `outputDir`.

| Key | Arquivo | Responsabilidade |
|---|---|---|
| `dockerCheck` | `tasks/docker-artifact-validator.ts` | Verifica se arquivos Docker existem em outputDir |
| `buildCheck` | `tasks/build-command-validator.ts` | Lê scripts do package.json via ctx.analysis |
| `envCheck` | `tasks/environment-checker.ts` | Sonda node/docker/PM via execSync (somente leitura) |
| `runtimeCheck` | `tasks/runtime-compatibility-checker.ts` | Valida versão do Node (depende de partial.envCheck) |
| `plan` | `tasks/execution-plan-generator.ts` | Gera execution-plan.json |
| `summary` | `tasks/summary-builder.ts` | Agrega issues → `readiness` final |
| `dryRun` | `tasks/dry-run-generator.ts` | Gera dry-run.md |

`ExecutionReadiness`: `'ready'` | `'ready-with-warnings'` | `'blocked'`
`ExecutionIssueSeverity`: `'blocker'` | `'warning'` | `'info'`

**Estrutura de output:**

```
output/<project>/
└── execution/
    ├── execution-plan.json
    └── dry-run.md
```

**Filosofia:** somente leitura — sondas de ambiente são read-only; nenhum build ou comando com side effects.

---

## Runtime Registry (`src/runtime/`)

Registrado em `src/runtime/index.ts`. **Único registry assíncrono** — `RuntimeRegistry.run()` usa `await` sequencial.

| Key | Arquivo | Responsabilidade |
|---|---|---|
| `install` | `tasks/npm-install-runner.ts` | Executa install em projectDir |
| `build` | `tasks/build-runner.ts` | Executa npm run build, valida artefatos |
| `dockerBuild` | `tasks/docker-build-runner.ts` | Executa docker build com Dockerfile do outputDir |
| `artifacts` | `tasks/artifact-validator.ts` | Valida existência de dist/, Dockerfile, .env.example |
| `log` | `tasks/runtime-logger.ts` | Gera runtime/runtime-log.json |
| `summary` | `tasks/execution-summary.ts` | Gera runtime/runtime-summary.md |

`RuntimeReadiness`: `'success'` | `'partial'` | `'failed'`

**`projectDir` vs `outputDir`:**
- `projectDir`: onde `npm install` e `npm run build` rodam (default: `ctx.source.inputPath`)
- `outputDir`: onde os artefatos gerados ficam — Dockerfile em `outputDir/docker/`
- `docker build` usa `--file outputDir/docker/Dockerfile` com contexto de `projectDir`

**`process.ts`:** `spawn` com `shell: false`; captura stdout/stderr limitado a 4096 bytes; mata com `SIGTERM` no timeout; sempre retorna `CommandResult` (nunca lança exceção).

**Estrutura de output:**

```
output/<project>/
└── runtime/
    ├── runtime-log.json
    └── runtime-summary.md
```

Em testes: copiar fixture para temp dir (`fs.cpSync`) antes de passar como `projectDir` — mantém fixtures somente leitura.

---

## Remote Registry (`src/remote/`)

Registrado em `src/remote/index.ts`. Síncrono — puro modeling/planning, zero I/O de rede.

`RemoteTaskContext` expõe `ctx`, `partial`, `outputDir` e `config` (`RemoteConfig`).

**Modelos-chave:**
- `HostProfile` — perfil simulado do host (OS, Node, Docker, portas, disco). Default: Ubuntu 22.04, Docker disponível, Node v20, disco 20GB
- `SshConfig` — configuração SSH (host, porta, usuário, keyPath). Validação de **formato apenas** — sem conexão real
- `RemoteConfig` — config interna resolvida (sshConfig + hostProfile + remotePath)

| Key | Arquivo | Responsabilidade |
|---|---|---|
| `hostCheck` | `tasks/host-compatibility-checker.ts` | Valida OS, Node ≥ 18, Docker, porta, disco ≥ 2GB |
| `sshCheck` | `tasks/ssh-config-validator.ts` | Valida formato SSH |
| `transferPlan` | `tasks/transfer-planner.ts` | Lista arquivos a transferir com tamanhos estimados |
| `deploymentCheck` | `tasks/deployment-strategy-checker.ts` | Valida estratégia vs. capacidades do host |
| `executionPlan` | `tasks/remote-execution-planner.ts` | Gera remote-execution-plan.json |
| `dryRun` | `tasks/remote-dry-run-generator.ts` | Gera remote-dry-run.md |
| `summary` | `tasks/remote-summary-builder.ts` | Gera remote-summary.md |

`RemoteReadiness`: `'ready'` | `'ready-with-warnings'` | `'blocked'`

**Passos fixos do execution plan:**
1. `create-remote-dirs` (remoto, risco baixo) — `mkdir -p`
2. `transfer-files` (local, risco médio) — `rsync`
3. `docker-build-remote` (remoto, risco médio) — `docker build`
4. `docker-compose-up` (remoto, risco alto) — `docker compose up -d`
5. `verify-health` (remoto, risco baixo) — `curl`

**Estrutura de output:**

```
output/<project>/
└── remote/
    ├── remote-execution-plan.json
    ├── remote-dry-run.md
    └── remote-summary.md
```

`RemoteOptions` aceita: `sshConfig`, `hostProfile`, `remotePath`. Defaults aplicados quando não fornecidos.

---

## Contrato planner → validator → migrator

O `ValidationResult` é o contrato entre as fases:

| Campo | Consumidor |
|---|---|
| `checklist` | migrator/deploy: lista de tarefas automatizáveis |
| `deployStrategy.recommended` | migrator: qual template/estratégia usar |
| `infrastructure` | deploy: quais recursos provisionar |
| `supabase.manualSteps` | UI: passos que requerem CLI ou dashboard |
| `risks` | migrator: refinados pelo validator |
| `safeToMigrate` | migrator: gate de segurança — `false` bloqueia por padrão |
| `blockingIssues` | CLI/TUI: issues com `code`, `rule`, `message`, `suggestion` |
| `summary.rulesExecuted` | auditabilidade |
