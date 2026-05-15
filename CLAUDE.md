# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Idioma obrigatório

**SEMPRE** responder ao usuário em português do Brasil — sem exceções, independente do idioma da pergunta ou do contexto técnico. Código, variáveis, funções e comandos de terminal permanecem em inglês.

## Visão do projeto

`lovable-migrate` é uma **engine de migração** para projetos exportados do [Lovable.dev](https://lovable.dev). Automatiza análise, planejamento, validação, geração de artefatos Docker, execução local e planejamento de deploy remoto. O projeto original nunca é modificado — tudo vai para `outputDir`.

## Roadmap de fases

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
| ✅ API Layer | `src/server/` | HTTP API via Fastify — thin layer sobre a engine, sem lógica de domínio |
| ✅ TUI v1 | `src/tui/` | Terminal UI interativa (Ink/React) — wizard de migração end-to-end |
| ✅ Sync v1 | `src/sync/` | Reconexão automática de user_ids entre projetos Supabase (email-matching, dry-run, rollback) |

Integrações externas: **Supabase** (`src/integrations/supabase/`). **Hostinger** (VPS) — planejada.

## Commands

```bash
npm run build            # compila TypeScript → dist/
npm run dev              # executa CLI via ts-node (sem build)
npm run typecheck        # verifica tipos sem emitir arquivos
npm run typecheck:test   # verifica tipos dos arquivos de teste
npm test                 # executa todos os testes (CI)
npm run test:watch       # modo interativo
npm run test:snapshots   # atualiza snapshots
```

Use `--` para separar flags do npm das flags da CLI:

```bash
npm run dev -- analyze <input> [-v] [-f terminal|json]
npm run dev -- plan    <input> [-v] [-f terminal|json]
npm run dev -- validate <input> [-v]
npm run dev -- migrate <input> [-o <dir>] [--force]
npm run dev -- ui
npm run dev -- server [--port 3001]
```

`<input>` aceita: pasta local, arquivo `.zip`, ou diretório com `.git`.
`--output` define o diretório de saída (padrão: `./output/<nome-do-projeto>`).

## Arquitetura

### Pipeline central

```
resolveSource(input)
  → source.load()      → ProjectFile[]
  → createContext()    → ProjectContext            (src/core/)
  → analyzeContext()   → ProjectContext + analysis (src/analyzer/)
  → planContext()      → ProjectContext + plan     (src/planner/)
  → validateContext()  → ProjectContext + validation (src/validator/)
  → migrateContext()   → ProjectContext + migration (src/migrator/)
  → deployContext()    → ProjectContext + deploy    (src/deploy/)
  → executeContext()   → ProjectContext + execution (src/executor/)
  → runContext()       → ProjectContext + runtime   (src/runtime/)
  → prepareContext()   → ProjectContext + remote    (src/remote/)
  → renderer.render()                              (src/output/)
```

`ProjectContext` (`src/core/types.ts`) é a espinha dorsal imutável. **Nunca mutar — sempre `{ ...ctx, novoCampo }`**.

### Módulos

| Módulo | Responsabilidade |
|---|---|
| `src/core/` | `ProjectContext`, `createContext`, `withAnalysis`, `withPlan`, `withValidation`, `withMigration` |
| `src/sources/` | `LocalFolderSource`, `ZipSource`, `GitHubSource` — `resolveSource()` detecta automaticamente |
| `src/analyzer/` | Análise via `DetectorRegistry` com 10 detectores especializados |
| `src/planner/` | Planejamento via `PlannerRegistry` com 7 strategies independentes |
| `src/validator/` | Validação via `ValidationRegistry` com 7 rules independentes |
| `src/migrator/` | Migração filesystem via `MigratorRegistry` com 6 tasks geradoras |
| `src/deploy/` | Artefatos Docker via `DeployerRegistry` — Dockerfile adaptado ao framework |
| `src/executor/` | Verificação de pré-condições + geração de plano (somente leitura) |
| `src/runtime/` | Execução local real via sandbox controlado |
| `src/remote/` | Planejamento de deploy remoto — modelagem pura, sem SSH |
| `src/server/` | HTTP API Fastify — thin layer, sem lógica de domínio |
| `src/tui/` | Terminal UI com Ink/React |
| `src/output/` | Renderização desacoplada: `Renderer`, `TerminalRenderer`, `JsonRenderer` |

### Sources e arquivos ignorados

`resolveSource()`: presença de `.git` → `GitHubSource`; extensão `.zip` → `ZipSource`; pasta → `LocalFolderSource`. `GitHubSource` lê repos clonados localmente — clone automático via API não está implementado.

`DEFAULT_IGNORE` (`src/sources/ignore.ts`) exclui: `node_modules`, `dist`, `.git`, `.next`, `coverage`, `test`, `examples`, `fixtures`, `*.log`. Detectores nunca recebem esses diretórios em `ProjectFile[]`.

**Crítico:** `ProjectFile.relativePath` sempre usa `/` (forward slashes), mesmo no Windows. Nunca use `path.sep` em detectores.

### Padrão Registry

Todos os módulos seguem o mesmo padrão:
- Capacidades (detector/strategy/task/rule) registradas em `index.ts` do módulo
- Registry executa em sequência, acumulando `Partial<T>` via reduce imutável
- Dependências entre steps passam por `ctx.partial` — nunca import direto entre detectores/strategies
- Adicionar nova capacidade = criar arquivo + registrar. Zero alterações no orquestrador

Para ordens de registro, dependências e estruturas de output de cada fase: `docs/registries.md`.

### Segurança do Runtime

`src/runtime/sandbox.ts` controla toda execução de comandos externos:
- **Whitelist:** `node`, `npm`, `npx`, `pnpm`, `yarn`, `bun`, `docker`
- Toda execução passa por `runSafeCommand` — nunca `runCommand` diretamente
- `spawn` com `shell: false` — metacaracteres de shell são impossíveis no nível do SO
- Nunca adicionar executáveis à whitelist sem revisão explícita de segurança

## TUI

A TUI é **camada de experiência** — não de domínio.

### Stack técnica

- **Ink v3.2.0** — única versão compatível com `"module": "commonjs"`. Ink v4+ é ESM-only.
- **React 17** — peer dependency do Ink v3.
- Testes de teclado: `await new Promise(r => setTimeout(r, 20))` antes de `stdin.write()` — `setImmediate` não é suficiente na primeira instância Ink criada.

### Regras

- Não adicionar lógica de domínio em screens ou components — toda decisão em `usePipeline` ou na engine
- Não chamar funções da engine diretamente em screens — sempre via `usePipeline`
- Screens não se importam entre si — comunicação via `nav.goTo()` e estado da sessão
- Components são puros — sem hooks de pipeline ou navegação
- Nova tela: criar em `screens/`, registrar em `app.tsx`. Sem mais alterações
- Novo componente: criar em `components/`, usar apenas Ink + theme

Para internals (TuiSession, usePipeline, testes): `docs/tui.md`.

## Como implementar uma nova fase do pipeline

1. Criar `src/<fase>/types.ts` — definir o tipo de output da fase
2. Adicionar campo `readonly` em `ProjectContext` em `src/core/types.ts`
3. Criar `src/<fase>/index.ts` — função que recebe `ProjectContext` e retorna `withX(ctx, resultado)`
4. Adicionar `withX` em `src/core/index.ts` seguindo o padrão de `withAnalysis`
5. Registrar a fase no pipeline em `src/cli.ts`
6. Exportar tipos e funções em `src/index.ts`

**Regras invioláveis:**
- Toda fase é pura: mesmo input → mesmo output, sem efeitos colaterais ocultos
- Toda fase retorna **novo** `ProjectContext` via spread — nunca mutar diretamente
- Toda fase tem seu próprio `types.ts` — nunca misturar tipos de fases diferentes
- Dependências circulares entre módulos são proibidas — grafo deve ser DAG
- Integrações externas ficam em `src/integrations/<nome>/` — nunca dentro de fases

## Decisões arquiteturais

- **Contexto imutável**: fases nunca mutam `ProjectContext`, sempre retornam novo objeto via spread.
- **Registry dinâmico**: novos detectores/strategies não requerem alteração no orquestrador, apenas registro.
- **Renderização desacoplada**: analyzer e planner não conhecem `chalk` ou terminal. Toda apresentação passa pela interface `Renderer`.
- **`packageJson` fora do registry**: extraído uma vez antes do registry e passado como input explícito — não é campo detectado.
- **Planner conservador**: nunca assume suporte automaticamente — `confidence: 'unknown'` e warnings explícitos quando dados são insuficientes.
- **Migrator filesystem-only**: tasks são puras (zero I/O); `writer.ts` é a única camada que toca disco; `outputDir` nunca é o projeto original.

## Convenções

- TypeScript strict mode — sem `any` exceto em casts controlados e documentados no registry.
- Compilação ES2020 + `module: commonjs` — não usar ESM puro (import dinâmico, top-level await).
- Comunicação com o usuário (logs, relatórios) em **português do Brasil**.
- Código, variáveis, funções, tipos e comentários técnicos em **inglês**.
- Backward compatibility: `printReport(report)` e `analyzeProject(files, name)` permanecem funcionais.
- **Composição sobre herança** — preferir `implements Interface` a `extends Classe`.

## Issues conhecidas

### Self-analysis contamination no detector de rotas

`src/analyzer/detectors/routes.ts` usa regex para encontrar padrões de rota no código-fonte. Ao analisar o próprio repositório da engine, detecta padrões dentro do seu próprio código (`/` e `/rota` em `routes.ts`). Impacto: baixo — só afeta análise do workspace da engine; projetos Lovable reais não têm esse problema.

Soluções candidatas (não implementadas): restringir a arquivos de app conhecidos (`src/App.tsx`, `pages/`, `app/`); ignorar `src/analyzer/` durante detecção; AST parsing; limitar ao framework conhecido.

## Testes

**Runner:** Vitest. Fixtures em `test/fixtures/` são **somente leitura**.

- Output sempre em `os.tmpdir()` — `makeTempDir()` + `removeTempDir()` em `afterAll`
- Sem chamadas de rede — nenhum teste acessa internet ou API externa
- Sem Docker instalado — testes validam conteúdo dos artefatos, não execução real
- Runtime: copiar fixture para temp dir (`fs.cpSync`) antes de qualquer `npm install`
- Snapshots: sempre `normalizeOutput()` antes de `toMatchSnapshot()` — remove timestamps e paths absolutos

Para estrutura completa, tabela de fixtures e filosofia de snapshots: `docs/development.md`.

## O que NÃO fazer

**Arquitetura e módulos:**
- Não passar `ProjectFile[]` diretamente entre módulos de alto nível — usar `ProjectContext`
- Não criar dependências circulares entre módulos — grafo deve ser DAG
- Não importar um detector dentro de outro — dependências passam por `ctx.partial`
- Não criar integrações externas dentro de fases — isolar em `src/integrations/<nome>/`
- Não usar herança onde composição resolve — `implements Interface` sobre `extends Classe`

**Separação de responsabilidades:**
- Não adicionar lógica de apresentação (`chalk`, `console.log` formatado) fora de `src/output/`
- Não adicionar lógica de negócio em renderers — `src/output/` é camada de apresentação pura
- Não adicionar lógica de domínio em telas TUI — fica em `usePipeline` ou na engine
- Não chamar funções da engine diretamente em screens TUI — sempre via `usePipeline`

**Imutabilidade e I/O:**
- Não mutar arrays ou objetos do contexto — imutabilidade é invariante do pipeline
- Não usar `path.sep` para comparar caminhos em detectores — `ProjectFile.relativePath` usa `/` sempre
- Não adicionar I/O em tasks do migrator — toda escrita em disco em `src/migrator/writer.ts`
- Não escrever fora do `outputDir` — `writer.ts` valida por path resolution antes de escrever

**Validator:**
- Não adicionar correção automática em rules — validator é somente leitura e classificação
- Não criar dependências entre rules — cada rule lê `ProjectContext` diretamente

**Executor e Runtime:**
- Não executar builds, `docker run`, ou comandos com side effects no executor
- Não usar `exec` ou `execFile` no runtime — apenas `spawn` com `shell: false` via `sandbox.ts`
- Não chamar `runCommand` diretamente nas tasks de runtime — sempre `runSafeCommand`
- Não adicionar executáveis à whitelist do sandbox sem revisão explícita

## Distribuição

Versão lida dinamicamente de `package.json` via `src/version.ts` — nunca hardcode versão no código.

Release: atualizar `package.json` → criar tag `vX.Y.Z` → push → CI faz o resto. **Nunca `npm publish` manual.**

Ver `docs/development.md` para o build pipeline completo e instruções de release.
