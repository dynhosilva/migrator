# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Visão do projeto

`lovable-migrate` é uma **engine de migração** para projetos exportados do [Lovable.dev](https://lovable.dev). O objetivo é automatizar a migração de projetos Lovable para ambientes self-hosted, cobrindo análise, planejamento, transformação de código, deploy e re-sincronização.

Atualmente implementado: análise inteligente (foundation). As próximas fases estão planejadas mas **não implementadas**.

## Roadmap de fases (em ordem)

| Fase | Módulo futuro | Responsabilidade |
|---|---|---|
| ✅ Analyze | `src/analyzer/` | Detecta stack, framework, Supabase, rotas, env vars |
| 🔲 Plan | `src/planner/` | Gera `MigrationPlan` a partir do `ProjectContext` com análise |
| 🔲 Migrate | `src/migrator/` | Executa transformações de código |
| 🔲 Deploy | `src/deploy/` | Empacota e envia (Hostinger, Docker) |
| 🔲 Re-sync | `src/sync/` | Re-sincronização com Lovable / Supabase |

Integrações externas planejadas: **Supabase** (migrations, auth, edge functions) e **Hostinger** (deploy de VPS).

## Commands

```bash
npm run build        # compila TypeScript → dist/
npm run dev          # executa CLI via ts-node (sem build)
npm run typecheck    # verifica tipos sem emitir arquivos
npm start            # executa o build compilado

# CLI (requer build ou use npm run dev)
node dist/cli.js inspect <input>                  # lista arquivos da fonte
node dist/cli.js analyze <input>                  # relatório terminal
node dist/cli.js analyze <input> --format json    # saída JSON
node dist/cli.js analyze <input> --verbose        # com logs debug
```

`<input>` aceita: pasta local, arquivo `.zip`, ou diretório com `.git`.

Não há test runner configurado ainda.

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
| `src/core/` | `ProjectContext`, `createContext`, `withAnalysis` |
| `src/sources/` | Leitura de fontes: `LocalFolderSource`, `ZipSource`, `GitHubSource`. `resolveSource()` detecta o tipo automaticamente |
| `src/analyzer/` | Análise via `DetectorRegistry` com 10 detectores especializados |
| `src/output/` | Renderização desacoplada: interface `Renderer`, `TerminalRenderer`, `JsonRenderer` |
| `src/logger/` | Logger com níveis `debug/info/warn/error` e flag verbose |

### Detector Registry (`src/analyzer/registry.ts`)

Detectores são registrados em `src/analyzer/index.ts`. A ordem de registro define a ordem de execução — detectores dependentes leem `ctx.partial` para acessar resultados anteriores.

```typescript
// Exemplo: routes depende de framework — registrado depois
registry
  .register({ key: 'framework', detect: ({ files, packageJson }) => detectFramework(files, packageJson) })
  .register({ key: 'routes',    detect: ({ files, partial })     => detectRoutes(files, partial.framework ?? 'unknown') })
```

Para adicionar um novo detector: criar arquivo em `detectors/`, registrar no registry — sem mais alterações.

### Output / Renderers

O `analyzer` não depende de `chalk` nem de nenhum renderer concreto. Para adicionar novo formato:

```typescript
export class MeuRenderer implements Renderer {
  render(ctx: ProjectContext): void { /* ctx.analysis contém o relatório */ }
}
```

## Decisões arquiteturais estabelecidas

- **Contexto imutável**: fases do pipeline nunca mutam `ProjectContext`, sempre retornam novo objeto via spread.
- **Registry dinâmico**: novos detectores não requerem alteração no orquestrador (`analyzer/index.ts`), apenas registro.
- **Renderização desacoplada**: `analyzer` não conhece `chalk`, terminal ou JSON. Toda apresentação passa pela interface `Renderer`.
- **`packageJson` fora do registry**: é pré-condição extraída antes do registry e passada como input — não é campo detectado.
- **`GitHubSource` — limitação atual**: lê repositórios já clonados localmente. Clone automático via API GitHub não está implementado.

## Convenções

- TypeScript strict mode obrigatório — sem `any` exceto em casts controlados e documentados no registry.
- Toda comunicação com o usuário (logs, relatórios) em **português do Brasil**.
- Código, nomes de variáveis, funções, tipos e comentários técnicos em **inglês**.
- Backward compatibility: `printReport(report)` e `analyzeProject(files, name)` permanecem funcionais. Novo código usa `analyzeContext(ctx)` e `renderer.render(ctx)`.
- Fases futuras (planner, migrator, deploy) devem seguir o padrão: recebem `ProjectContext`, enriquecem com seu campo, retornam novo contexto.

## O que NÃO fazer

- Não passar `ProjectFile[]` diretamente entre módulos de alto nível — usar `ProjectContext`.
- Não adicionar lógica de apresentação (`chalk`, `console.log` formatado) fora de `src/output/`.
- Não implementar planner, migrator, deploy ou sync antes de consolidar a fase atual.
- Não criar "god objects" flat — novos campos de análise vão em sub-interfaces específicas.
- Não mutar arrays ou objetos do contexto — imutabilidade é invariante do pipeline.
