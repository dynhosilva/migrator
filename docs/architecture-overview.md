# Visão geral da arquitetura

Guia para contribuidores que querem entender como o `lovable-migrate` funciona internamente.

---

## Princípios centrais

### 1. Contexto imutável

O `ProjectContext` é a espinha dorsal do pipeline. Cada fase recebe o contexto e retorna **um novo contexto** com seu campo preenchido — nunca mutação direta:

```typescript
// Correto
return { ...ctx, analysis: report };

// Errado — nunca fazer
ctx.analysis = report;
```

Isso garante que qualquer fase pode ser reexecutada de forma segura, e que estados intermediários são auditáveis.

### 2. Registry pattern

Todos os módulos usam um registry de estratégias/detectores/tasks. Isso significa:

- **Adicionar uma capacidade** = criar um arquivo + registrar
- **Sem alteração no orquestrador**
- **Ordem de execução** controlada pela ordem de registro
- **Dependências entre itens** passam por `ctx.partial` — nunca por import direto

```typescript
registry
  .register({ key: 'framework', detect: ({ files }) => detectFramework(files) })
  .register({ key: 'routes',    detect: ({ files, partial }) => detectRoutes(files, partial.framework) });
```

### 3. Camadas sem domínio

CLI, API HTTP e TUI são transportes — não contêm lógica de negócio. Toda decisão está na engine.

```
CLI     ← Commander  → chama engine diretamente
API     ← Fastify    → thin layer, sem lógica
TUI     ← Ink/React  → usePipeline() é o único contato com a engine
```

### 4. I/O isolado

Apenas dois locais no código fazem I/O de disco:
- `src/migrator/writer.ts` — valida que todo path está dentro do `outputDir`
- `src/runtime/process.ts` — executa processos com `spawn({ shell: false })`

Tasks, detectores, strategies e rules são **funções puras** — mesmo input, mesmo output, sem efeitos colaterais.

---

## ProjectContext

```typescript
interface ProjectContext {
  readonly source:     SourceInfo;       // metadados da fonte
  readonly files:      ProjectFile[];    // arquivos carregados (sem node_modules, dist, etc.)
  readonly meta:       ProjectMeta;      // nome, outputDir
  readonly analysis?:  AnalysisReport;  // preenchido por analyzeContext()
  readonly plan?:      MigrationPlan;   // preenchido por planContext()
  readonly validation?: ValidationResult; // preenchido por validateContext()
  readonly migration?: MigrationResult;  // preenchido por migrateContext()
  readonly deploy?:    DeployState;      // preenchido por deployContext()
  readonly execution?: ExecutionState;   // preenchido por executeContext()
  readonly runtime?:   RuntimeState;     // preenchido por runContext()
  readonly remote?:    RemoteState;      // preenchido por prepareContext()
}
```

---

## Fases do pipeline

### Analyze — `src/analyzer/`

**Input:** `ProjectFile[]` do contexto  
**Output:** `AnalysisReport` — framework, buildSystem, packageManager, supabase, envVars, etc.

O `DetectorRegistry` executa 10 detectores em sequência. Cada detector recebe `{ files, packageJson, partial }` e retorna um campo do `AnalysisReport`. Detectores com dependências leem `partial` — nunca importam de outros detectores.

```
language → framework → buildSystem → packageManager → tailwind
→ supabase → lovable → envVars → routes (deps: framework) → criticalFiles
```

Os arquivos em `src/analyzer/detectors/` são totalmente independentes uns dos outros.

---

### Plan — `src/planner/`

**Input:** `AnalysisReport`  
**Output:** `MigrationPlan` — deployStrategy, infrastructure, env, risks, checklist

O `PlannerRegistry` executa 7 strategies. Cada strategy recebe `{ analysis, partial }` e retorna um campo do `MigrationPlan`. A posição no registry define a ordem e, portanto, quais campos de `partial` já estão disponíveis.

**Postura conservadora:** quando dados são insuficientes, o planner usa `confidence: 'unknown'`, lista env vars como `required` e `missing`, e gera warnings explícitos. Sem suposições silenciosas.

---

### Validate — `src/validator/`

**Input:** `ProjectContext` completo (com `analysis` + `plan`)  
**Output:** `ValidationResult` — `safeToMigrate`, `blockingIssues`, `warnings`, `infos`

O `ValidationRegistry` executa 7 rules. Cada rule lê o `ProjectContext` e retorna `ValidationIssue[]`. Rules são completamente independentes — nunca importam umas das outras.

**Severidades:**
- `critical` → marca `safeToMigrate = false` — bloqueia o pipeline
- `warning` → visível, não bloqueia
- `info` → contexto

O `safeToMigrate: false` bloqueia o comando `migrate` por padrão. Use `--force` para prosseguir.

---

### Migrate — `src/migrator/`

**Input:** `ProjectContext` + `outputDir`  
**Output:** `MigrationResult` + artefatos em disco

**Separação crítica:**
- Tasks (`src/migrator/tasks/`) — **puras**: retornam `GeneratedFile[]`, zero I/O
- Writer (`src/migrator/writer.ts`) — **única camada com I/O**: valida paths antes de escrever

O `MigratorRegistry` executa 6 tasks em sequência. A task `report` depende das anteriores via `partial` e agrega o relatório final.

```
env → migrations → edgeFunctions → deployInstructions → folderReadmes → report
```

---

### Deploy — `src/deploy/`

**Input:** `ProjectContext` + `outputDir`  
**Output:** `DeployState` + artefatos Docker em disco

Segue o mesmo padrão do migrator. A task `docker` gera todos os artefatos Docker (Dockerfile, docker-compose.yml, .dockerignore, README.md). A task `report` gera `deploy-report.json`.

O Dockerfile é gerado com base em `deployStrategy`:
- `static` → nginx multi-estágio
- `node-server` → node:18-alpine multi-estágio (3 fases)
- `docker`/`unknown` → genérico

---

### Execute — `src/executor/`

**Input:** `ProjectContext` + `outputDir`  
**Output:** `ExecutionState` + `execution-plan.json` + `dry-run.md`

**Filosofia:** somente leitura e planejamento — sem executar builds, sem `docker run`. As tasks sondam o ambiente (`node --version`, `docker --version`) para verificar pré-condições, mas não executam nada destrutivo.

---

### Runtime — `src/runtime/`

**Input:** `ProjectContext` + `outputDir` + `projectDir`  
**Output:** `RuntimeState` + `runtime-log.json` + `runtime-summary.md`

A única fase assíncrona. Executa processos reais — **sempre** via `runSafeCommand()` do `sandbox.ts`.

**Sandbox:**
- Whitelist: `node`, `npm`, `npx`, `pnpm`, `yarn`, `bun`, `docker`
- `spawn({ shell: false })` — metacaracteres nunca são interpretados
- Null byte blocking nos argumentos

`projectDir` (onde `npm install` roda) ≠ `outputDir` (onde os artefatos ficam). O `docker build` usa `--file outputDir/docker/Dockerfile` com contexto de `projectDir`.

---

### Remote — `src/remote/`

**Input:** `ProjectContext` + `outputDir` + `RemoteOptions`  
**Output:** `RemoteState` + plano SSH + dry-run + summary

Modelagem pura — sem conexões de rede. Gera comandos SSH prontos baseados em `RemoteConfig` (sshConfig + hostProfile + remotePath). O `DEFAULT_HOST_PROFILE` é Ubuntu 22.04 com Docker e Node v20.

---

## Camadas de transporte

### CLI — `src/cli.ts`

Commander gerencia comandos e flags. Cada comando:
1. Resolve o input via `resolveSource()`
2. Chama as funções da engine em sequência (`analyzeContext`, `planContext`, etc.)
3. Renderiza o resultado via `TerminalRenderer` ou `JsonRenderer`

### API HTTP — `src/server/`

Fastify como thin layer. Cada handler:
1. Valida o body com JSON schema
2. Chama as funções da engine
3. Retorna o envelope padrão `{ success, requestId, durationMs, data }`

Sem lógica de domínio nos handlers. Rate limiting via `@fastify/rate-limit`.

### TUI — `src/tui/`

```
app.tsx          ← router raiz: session.screen → componente
state/           ← reducer puro (tuiReducer) + TuiSession
hooks/
  usePipeline    ← ÚNICO ponto de contato com a engine
  useNavigation  ← goTo(), goBack()
components/      ← Ink components, puros e reutilizáveis
screens/         ← telas compostas, sem lógica de domínio
theme/           ← paleta de cores e símbolos centralizada
```

O `tuiReducer` é puro — testável sem Ink. Toda mutação de estado via `dispatch(action)`.

`usePipeline` é o único ponto onde a TUI toca a engine. Screens nunca chamam a engine diretamente.

---

## Como adicionar uma nova fase

1. Criar `src/<fase>/types.ts` — definir o tipo de output
2. Adicionar campo `readonly <fase>?: <Tipo>` em `ProjectContext` (`src/core/types.ts`)
3. Criar `src/<fase>/index.ts` — função `<fase>Context(ctx, ...)` + `with<Fase>(ctx, resultado)`
4. Adicionar `with<Fase>` em `src/core/index.ts`
5. Registrar no CLI em `src/cli.ts`
6. Exportar em `src/index.ts`

---

## Grafo de dependências

```
sources → core → analyzer → planner → validator
                                           ↓
                               migrator → deploy → executor → runtime → remote
                                           ↓
                                        output (renderers)
```

Nenhuma dependência circular. CLI, API e TUI importam de `src/index.ts` — nunca de módulos internos diretamente.
