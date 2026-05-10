# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Visão do projeto

`lovable-migrate` é uma **engine de migração** para projetos exportados do [Lovable.dev](https://lovable.dev). O objetivo é automatizar a migração de projetos Lovable para ambientes self-hosted, cobrindo análise, planejamento, transformação de código, deploy e re-sincronização.

Atualmente implementado: análise inteligente (foundation). As próximas fases estão planejadas mas **não implementadas**.

## Roadmap de fases (em ordem)

| Fase | Módulo | Responsabilidade |
|---|---|---|
| ✅ Analyze | `src/analyzer/` | Detecta stack, framework, Supabase, rotas, env vars |
| ✅ Plan | `src/planner/` | Gera `MigrationPlan` a partir do `AnalysisReport` via registry de strategies |
| ✅ Migrate v1 | `src/migrator/` | Gera artefatos filesystem (env, migrations, instruções, relatório) |
| 🔲 Deploy | `src/deploy/` | Empacota e envia (Hostinger, Docker) |
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
npm run dev -- migrate <input> [-v|--verbose] [-f|--format terminal|json] [-o|--output <dir>]

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
  → source.load()    → ProjectFile[]
  → createContext()  → ProjectContext           (src/core/)
  → analyzeContext() → ProjectContext enriched  (src/analyzer/)
  → renderer.render()                           (src/output/)
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
| `src/core/` | `ProjectContext`, `createContext`, `withAnalysis`, `withPlan`, `withMigration` |
| `src/sources/` | Leitura de fontes: `LocalFolderSource`, `ZipSource`, `GitHubSource`. `resolveSource()` detecta o tipo automaticamente |
| `src/analyzer/` | Análise via `DetectorRegistry` com 10 detectores especializados |
| `src/planner/` | Planejamento via `PlannerRegistry` com 7 strategies independentes |
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

### Fluxo planner → migrator

O `MigrationPlan` é o contrato entre o planner e o migrator:
- `checklist` → lista de tarefas que o migrator/deploy pode executar automaticamente
- `deployStrategy.recommended` → informa ao migrator qual template/estratégia usar
- `infrastructure` → informa ao deploy quais recursos provisionar
- `supabase.manualSteps` → itens que não podem ser automatizados (requerem CLI ou dashboard)
- `risks` → o migrator deve bloqueiar em riscos `critical` antes de prosseguir

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
