# Arquitetura

## Visão geral

`lovable-migrate` é uma engine de pipeline imutável. Cada fase recebe um `ProjectContext` e retorna um novo contexto enriquecido — nunca o modifica diretamente.

## Pipeline central

```
resolveSource(input)
  → source.load()      → ProjectFile[]
  → createContext()    → ProjectContext
  → analyzeContext()   → ProjectContext + analysis
  → planContext()      → ProjectContext + plan
  → validateContext()  → ProjectContext + validation
  → migrateContext()   → ProjectContext + migration   [escreve disk]
  → deployContext()    → ProjectContext + deploy      [escreve disk]
  → executeContext()   → ProjectContext + execution   [escreve disk]
  → runContext()       → ProjectContext + runtime     [executa comandos]
  → prepareContext()   → ProjectContext + remote
```

## ProjectContext — espinha dorsal imutável

```typescript
interface ProjectContext {
  readonly source:     SourceInfo;
  readonly files:      ProjectFile[];
  readonly meta:       ProjectMeta;
  readonly analysis?:  AnalysisReport;
  readonly plan?:      MigrationPlan;
  readonly validation?: ValidationResult;
  readonly migration?: MigrationResult;
  readonly deploy?:    DeployState;
  readonly execution?: ExecutionState;
  readonly runtime?:   RuntimeState;
  readonly remote?:    RemoteState;
}
```

Cada fase usa `{ ...ctx, novoCampo }` — imutabilidade garantida em todas as transições.

## Fases e responsabilidades

### Analyze (`src/analyzer/`)
- **Input:** `ProjectFile[]` do `ProjectContext`
- **Output:** `AnalysisReport` — framework, buildSystem, packageManager, envVars, supabase, routes, etc.
- **Mecanismo:** `DetectorRegistry` com 10 detectores independentes em sequência

### Plan (`src/planner/`)
- **Input:** `AnalysisReport`
- **Output:** `MigrationPlan` — deployStrategy, infrastructure, env, risks, checklist
- **Postura:** conservadora — usa `confidence: 'unknown'` quando dados insuficientes

### Validate (`src/validator/`)
- **Input:** `ProjectContext` com `analysis` + `plan`
- **Output:** `ValidationResult` — `safeToMigrate`, `blockingIssues`, `warnings`
- **Gate:** `safeToMigrate: false` bloqueia `migrate` (superável com `--force`)

### Migrate (`src/migrator/`)
- **Input:** `ProjectContext` + `outputDir`
- **Output:** `MigrationResult` — arquivos gerados (env, SQL, instruções)
- **I/O:** único módulo com escrita em disco — isolado em `writer.ts`

### Deploy (`src/deploy/`)
- **Input:** `ProjectContext` + `outputDir`
- **Output:** `DeployState` — Dockerfile, docker-compose.yml, .dockerignore
- **Adaptação:** Dockerfile gerado conforme `deployStrategy` (static/node-server/docker)

### Execute (`src/executor/`)
- **Input:** `ProjectContext` + `outputDir`
- **Output:** `ExecutionState` — plano de execução + dry-run (somente leitura)
- **Segurança:** não executa comandos — apenas verifica pré-condições e gera plano

### Runtime (`src/runtime/`)
- **Input:** `ProjectContext` + `outputDir` + `projectDir`
- **Output:** `RuntimeState` — resultados de `npm install`, `npm run build`, `docker build`
- **Sandbox:** whitelist de executáveis; `spawn` com `shell: false`

### Remote (`src/remote/`)
- **Input:** `ProjectContext` + `outputDir` + `RemoteOptions`
- **Output:** `RemoteState` — plano de execução remota (sem SSH real)
- **Segurança:** modelagem pura — nenhuma conexão de rede aberta

## Padrão Registry

Todos os módulos usam um registry de estratégias/detectores/tasks:

```typescript
registry
  .register({ key: 'framework', detect: (ctx) => detectFramework(ctx.files, ctx.packageJson) })
  .register({ key: 'routes',    detect: (ctx) => detectRoutes(ctx.files, ctx.partial.framework) });
```

Adicionar nova capacidade = criar arquivo + registrar. Sem alterações no orquestrador.

## Camadas de transporte

| Camada | Módulo | Responsabilidade |
|---|---|---|
| CLI | `src/cli.ts` | Commander — comandos e flags |
| API HTTP | `src/server/` | Fastify — thin layer sobre engine |
| TUI | `src/tui/` | Ink/React — wizard interativo |

Nenhuma das três camadas contém lógica de domínio — todas chamam os módulos da engine diretamente.

## Segurança e limites

- Nenhuma fase modifica o projeto original
- Toda escrita em disco valida que o path está dentro do `outputDir`
- Runtime usa sandbox com whitelist de executáveis
- Remote não abre SSH real
- API valida schema e bloqueia campos extras por padrão
