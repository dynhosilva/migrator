# HANDOFF.md — lovable-migrate

> Data: 2026-05-14 | Versão: 0.3.3 | Branch: main
>
> Este documento é o ponto de retomada. Leia do início ao fim antes de escrever qualquer código.

---

## 1. Estado atual em uma frase

O `lovable-migrate` é uma engine CLI de migração para projetos Lovable.dev, com pipeline completo (analyze → cicd), API HTTP, TUI interativa, e um módulo `sync-users` de reconexão automática de user_ids entre projetos Supabase — implementado, testado com mocks e hardened para uso em produção, mas ainda sem validação E2E real com Supabase vivo.

---

## 2. O que foi feito hoje (2026-05-14)

### Commits do dia (4 commits, em ordem)

| Hash | Mensagem |
|---|---|
| `ade465b` | `feat(sync): user-id remapping between Supabase projects` — sync-users v1 |
| `ad585b7` | `feat(sync): visual wizard + confidence scoring + HTML report` — sync-ui v2 |
| `7916961` | `fix(sync): production hardening — critical bug fixes + comprehensive test suite` — v3 |
| `ee8f5f0` | `fix(sync): production hardening — timeouts, retry, concurrency, backup safety, key masking` — v4 |

### Funcionalidades implementadas hoje

**sync-users v1 (`ade465b`):**
- Detecção automática de colunas `user_id` via OpenAPI do PostgREST
- Matching de usuários por email entre dois projetos Supabase
- Dry-run seguro sem escrita
- Backup JSON antes de qualquer UPDATE
- Rollback via backup
- Updates em batch por usuário/coluna
- Relatório terminal + HTML
- CLI: `lovable-migrate sync-users [flags]`

**sync-ui v2 (`ad585b7`):**
- TUI wizard com 8 telas (Ink v3): Welcome → Connect → Discover → Preview → Confirm → Progress → Report → Error
- Confidence scoring: 70 base + ±provider + ±dates (high/medium/suspicious)
- HTML report dark-theme com stats, tabelas de usuários/colunas, erros, avisos
- `buildUserSyncPlan()` + `executeSyncPlan()` separados (para wizard)
- CLI: `lovable-migrate sync-ui`

**Bug fixes críticos v3 (`7916961`):**
- `createBackup()` virou síncrono — elimina bug de 1000-row limit do PostgREST
- `.select('id')` → `.select(col.columnName)` — remove assumção de coluna 'id'
- UUID validation em todo write — rejeita dados malformados antes de tocar o banco
- `detectConflicts()` novo módulo — detecta new_uuid com dados antes de migrar
- `validateSyncConfig()` novo módulo — URL format, JWT role decode, anon key detection
- `validateCredentials()` — smoke test de conectividade com Supabase
- 54 novos testes (unit + integration mocked)

**Production hardening v4 (`ee8f5f0`):**
- `src/sync/utils/retry.ts` — backoff exponencial + jitter, erros transitórios
- `src/sync/utils/timeout.ts` — AbortController (fetch) + Promise.race (Supabase), DEFAULT_TIMEOUTS
- `src/sync/utils/mask.ts` — redação de JWTs em mensagens de erro
- `src/sync/executor/checkpoint.ts` — atomic save/load, buildCompletedSet, findLatestCheckpoint
- `batch-updater`: worker-pool concorrente (padrão: 10 paralelo), timeout+retry por call
- `backup-manager`: atomic write (tmp→rename), try/catch com ENOSPC detection, validação JSON no restore
- `dry-runner`: todos os count queries em paralelo (O(1) RTT em vez de O(cols))
- `conflict-detector`: Promise.all para counts — elimina N+1 sequencial
- `email-matcher`: erro mid-pagination vira warning em vez de crash silencioso
- `schema-inspector`: AbortController + retry no fetch do OpenAPI spec
- `html-report`: `escapeHtml` completo (inclui `"` e `'`), limite 500 linhas, atomic write
- `index.ts`: masking em todos os caminhos de erro, backup path em destaque antes de writes
- `SyncOptions`: novos campos `timeout?`, `maxRetries?`, `concurrency?`, `resumeFrom?`
- `TEST_PLAN.md`: 16 seções, 60+ cenários de teste, 12 known issues, critérios de produção
- Benchmark: `src/sync/benchmark/runner.ts` — verifica 10x speedup com concurrency=10

---

## 3. Arquitetura atual

### Pipeline principal (não-sync)

```
resolveSource(input)
  → source.load()         → ProjectFile[]
  → createContext()       → ProjectContext           src/core/
  → analyzeContext()      → + analysis               src/analyzer/
  → planContext()         → + plan                   src/planner/
  → validateContext()     → + validation             src/validator/
  → migrateContext()      → + migration              src/migrator/
  → deployContext()       → + deploy                 src/deploy/
  → executeContext()      → + execution              src/executor/
  → runContext()          → + runtime                src/runtime/
  → prepareContext()      → + remote                 src/remote/
  → renderer.render()                                src/output/
```

**Invariante absoluta:** `ProjectContext` é imutável — toda fase retorna `{ ...ctx, novoCampo }`.

### Módulo sync (standalone, não usa ProjectContext)

```
SyncConfig (url + serviceKey × 2 + SyncOptions)
  │
  ├── Phase 0: validateSyncConfig()      [síncrono, sem rede]
  │     └── validateCredentials()        [paralelo, com timeout]
  │
  ├── Phase 1: buildUserSyncPlan()
  │     ├── fetchOpenApiSpec()           [timeout + retry + AbortController]
  │     ├── findUserIdColumns()          [puro, sem I/O]
  │     ├── matchUsersByEmail()          [paginação com warning mid-error]
  │     ├── buildSyncPlan()             [counts paralelos + timeout]
  │     └── detectConflicts()           [paralelo, N+1 eliminado]
  │
  └── Phase 2: executeSyncPlan()
        ├── createBackup()              [síncrono, atomic write]
        ├── saveCheckpoint()            [atomic, para resume]
        ├── executeUpdates()            [worker-pool concorrente, timeout+retry]
        └── restoreFromBackup()        [retry, validação JSON prévia]
```

### Estrutura de arquivos do sync

```
src/sync/
├── index.ts                    # Orquestrador: buildUserSyncPlan + executeSyncPlan + syncUsers
├── types.ts                    # Todos os tipos: UserMapping, SyncPlan, SyncResult, SyncOptions...
├── benchmark/
│   └── runner.ts               # Benchmark de performance (sequential vs concurrent)
├── detection/
│   ├── conflict-detector.ts    # detectConflicts() + describeConflict()
│   └── user-id-detector.ts     # detectUserIdColumns() via schema-inspector
├── executor/
│   ├── backup-manager.ts       # createBackup() + restoreFromBackup() [hardened]
│   ├── batch-updater.ts        # executeUpdates() [worker-pool, timeout, retry, checkpoint]
│   ├── checkpoint.ts           # save/load/buildCompletedSet [atomic]
│   └── dry-runner.ts           # buildSyncPlan() [paralelo]
├── mapping/
│   ├── confidence-scorer.ts    # scoreMatch() → {level, score, reasons}
│   └── email-matcher.ts        # matchUsersByEmail() [paginação hardened]
├── report/
│   ├── html-report.ts          # generateHtmlReport() [atomic, escapeHtml completo, limite 500]
│   └── sync-report.ts          # printSyncReport() [terminal]
├── tui/
│   ├── app.tsx                 # SyncApp (useReducer, 8 telas)
│   ├── index.ts                # startSyncWizard()
│   ├── hooks/
│   │   ├── useSyncNav.ts       # goTo() / goToError()
│   │   └── useSyncOp.ts        # discover() / execute() [sanitizeError, concurrency]
│   ├── screens/                # 8 telas: Welcome, Connect, Discover, Preview, Confirm,
│   │   └── *.tsx               #          Progress, Report, Error
│   └── state/
│       ├── reducer.ts          # syncWizardReducer + INITIAL_SYNC_SESSION
│       └── types.ts            # SyncScreen (8 valores) + SyncWizardAction
├── utils/
│   ├── mask.ts                 # maskKey() + sanitizeMessage() + sanitizeError()
│   ├── retry.ts                # withRetry() + isRetryable() + DEFAULT_RETRY
│   └── timeout.ts              # withTimeout() + fetchWithTimeout() + DEFAULT_TIMEOUTS
└── validation/
    └── validate-config.ts      # validateSyncConfig() + validateCredentials()

src/integrations/supabase/
├── admin-client.ts             # createAdminClient()
├── schema-inspector.ts         # fetchOpenApiSpec() + findUserIdColumns() [timeout hardened]
└── types.ts                    # SupabaseConfig + OpenApiSpec
```

---

## 4. Fluxo sync-users (CLI)

```bash
lovable-migrate sync-users \
  --old-url https://<OLD>.supabase.co \
  --old-key eyJhbGci... \
  --new-url https://<NEW>.supabase.co \
  --new-key eyJhbGci... \
  [--dry-run] [--backup-dir ./backups] [--verbose]
  [--timeout 30000] [--max-retries 3] [--concurrency 10]
  [--extra-columns table.column] [--skip-tables t1,t2]
```

**Sequência interna:**
1. `validateSyncConfig()` — verifica URL, JWT structure, JWT role (sem rede)
2. `validateCredentials()` ×2 em paralelo — smoke test com timeout
3. `fetchOpenApiSpec()` — busca schema PostgREST com timeout + retry
4. `findUserIdColumns()` — identifica colunas alvo
5. `matchUsersByEmail()` — lista usuários de ambos projetos em paralelo
6. `buildSyncPlan()` — conta rows afetados em paralelo por coluna
7. `detectConflicts()` — verifica new_uuid com dados existentes
8. Se dry-run: retorna plano + HTML report
9. `createBackup()` — JSON atômico antes de qualquer write
10. Exibe path do backup em destaque no terminal
11. `saveCheckpoint()` — arquivo de checkpoint inicializado
12. `executeUpdates()` — worker-pool com concurrency=10, timeout, retry, checkpoint
13. Se erros: `restoreFromBackup()` automático
14. `generateHtmlReport()` — HTML atômico em backupDir

---

## 5. Fluxo sync-ui (TUI wizard)

```bash
lovable-migrate sync-ui
```

**8 telas em sequência:**
```
SyncWelcome  →  SyncConnect (Tab entre campos)
             →  SyncDiscover (spinner + logs ao vivo)
             →  SyncPreview (confidence badges, conflitos)
             →  SyncConfirm (revisão de suspicious matches)
             →  SyncProgress (log ao vivo de cada UPDATE)
             →  SyncReport (resumo final + path do backup)
```

**Estado global:** `useReducer(syncWizardReducer, INITIAL_SYNC_SESSION)` em `SyncApp`

**Comunicação:** `useSyncOp.discover()` chama `buildUserSyncPlan()`, `useSyncOp.execute()` chama `executeSyncPlan()`. Telas nunca chamam engine diretamente.

---

## 6. Hardenings implementados (resumo técnico)

| Hardening | Antes | Depois |
|---|---|---|
| Timeouts | Nenhum — hang infinito | DEFAULT_TIMEOUTS por tipo (15–30s) + AbortController no fetch |
| Retry | Nenhum | Backoff exponencial + jitter, máx 3 tentativas, erros transitórios |
| Concorrência | 1 UPDATE de cada vez, O(n×m) | Worker-pool, padrão 10 paralelo, configurável |
| Backup write | `writeFileSync` sem catch | `tmp → rename` atômico, try/catch ENOSPC, erro humanizado |
| Restore | `JSON.parse` direto | try/catch + validação de schema por entrada antes de tocar BD |
| Dry-runner | For sequencial por coluna | `Promise.all` paralelo — O(1) RTT |
| Conflict detection | N+1 sequencial | `Promise.all` paralelo dos counts |
| Paginação usuarios | Erro mid-page = crash | Erro mid-page = warning + retorna parcial |
| Key masking | Service key em clear em erros | `sanitizeMessage()` redige JWTs via regex |
| escapeHtml | Faltava `"` e `'` | Completo — protege atributos HTML |
| HTML report | Ilimitado — 10k linhas | Limite 500 + nota de truncamento + atomic write |
| Checkpoint | Inexistente | `checkpoint.ts` — resume após crash, atomic save |
| Error casting | `(err as Error).message` | `toErrorMessage(unknown)` type-safe |

---

## 7. Benchmarks

Simulados com 20ms de latência por chamada, concurrency=10:

| Cenário | Antes (sequencial) | Depois (10x paralelo) | Speedup |
|---|---|---|---|
| 100 users × 5 cols | 15.5s | 1.6s | **10x** |
| 1.000 users × 5 cols | 2.6 min | 15.6s | **10x** |
| 1.000 users × 10 cols | 5.2 min | 31.2s | **10x** |
| 10.000 users × 5 cols | 26 min | 2.6 min | **10x** |

Dry-run counts: sempre O(1) rodada paralela independente do número de usuários.
Conflict detection: era O(N) sequencial, agora O(1) rodada paralela.

---

## 8. Testes

**26 arquivos de teste, 336 testes, 100% passando.**

| Diretório | Arquivo | Testes | O que cobre |
|---|---|---|---|
| `test/sync/unit/` | `confidence-scorer.test.ts` | 8 | scoreMatch(), nível, clamping |
| `test/sync/unit/` | `schema-inspector.test.ts` | 7 | findUserIdColumns(), Swagger 2.0 e OAS 3.0 |
| `test/sync/unit/` | `validate-config.test.ts` | 9 | URL, JWT, role, same-project |
| `test/sync/integration/` | `email-matcher.test.ts` | 8 | match, skip, paginação, case |
| `test/sync/integration/` | `backup-rollback.test.ts` | 9 | createBackup, restoreFromBackup |
| `test/sync/integration/` | `conflict-detector.test.ts` | 5 | detectConflicts, describeConflict |
| `test/sync/integration/` | `batch-updater.test.ts` | 7 | executeUpdates, UUID, concorrência |
| Outros 19 arquivos | pipeline, TUI, server... | 283 | Pipeline completo, API, CLI |

**Comandos:**
```bash
npm test                  # suite completa
npm run typecheck         # src/ (0 erros)
npm run typecheck:test    # test/ (0 erros)
npm run test:watch        # modo interativo
npm run test:snapshots    # atualiza snapshots
```

---

## 9. Pendências restantes (abertas)

### Bloqueadores de produção comercial

| ID | Pendência | Esforço estimado |
|---|---|---|
| P1 | **Validação E2E real** com Supabase vivo — nenhum teste tocou banco real ainda | 1 dia + Supabase accounts |
| P2 | **TUI: persistência de sessão** — fechar terminal durante execução perde path do backup | 1 dia |
| P3 | **Idempotência documentada** — segunda execução após migração parcial sem aviso | 2h |
| P4 | **Rate limiting do Supabase** — 429 retried mas sem backpressure consciente | 4h |

### Melhorias de UX/segurança (não bloqueadores)

| ID | Pendência | Esforço estimado |
|---|---|---|
| M1 | Input masking da service key na TUI (Ink v3 não tem campo tipo password nativo) | 1 dia |
| M2 | `--resume` como flag de CLI (hoje só via `SyncOptions.resumeFrom`) | 2h |
| M3 | Lock file para evitar duas instâncias do sync rodando simultaneamente | 4h |
| M4 | Logs estruturados (JSON) para `--output-format json` | 4h |
| M5 | Limite configurável de usuários (`--max-users`) com warning antes de atingir | 2h |
| M6 | Segunda tentativa de rollback se o primeiro falhar parcialmente | 4h |

---

## 10. Riscos conhecidos ainda abertos

| ID | Risco | Severidade | Mitigação atual |
|---|---|---|---|
| KI-09 | TUI sem persistência — crash = usuário sem path do backup | MÉDIO | Backup path exibido no terminal antes de executar |
| KI-12 | Segunda execução após migração parcial sem aviso de idempotência | MÉDIO | Documentado em TEST_PLAN.md seção PM-02 |
| R1 | Supabase rate limit (429) — retried mas sem controle de concorrência adaptativo | BAIXO | Retry implementado, concurrency configurável |
| R2 | Tabelas com FK — ordem de atualização não controlada (pode violar FK temporariamente) | BAIXO | Documentado em TEST_PLAN.md seção CT-03 |
| R3 | Backup JSON em texto claro — contém UUIDs legíveis | INFORMATIVO | UUIDs não são credenciais; service keys nunca aparecem no backup |

---

## 11. Próximos passos recomendados (em ordem de prioridade)

### Prioridade 1 — Validação E2E real (próxima sessão principal)

```bash
# 1. Criar dois projetos Supabase de teste
# 2. Executar o checklist do TEST_PLAN.md seção 14
# 3. Começar por ST-01 a ST-05 (smoke tests)
# 4. Executar E2E-01 (1 usuário, 1 tabela)
# 5. Executar RB-01 (rollback após migração)
# 6. Registrar resultados no TEST_PLAN.md
```

**Credenciais necessárias:** duas service_role keys de projetos Supabase distintos.

### Prioridade 2 — TUI: persistência de sessão (KI-09)

Salvar `{ backupFile, checkpointFile }` em `~/.lovable-migrate/sync-session.json` ao iniciar execução. Na tela `SyncReport`, exibir instrução explícita de rollback caso o terminal feche.

### Prioridade 3 — Idempotência (KI-12)

Em `buildUserSyncPlan`, se `detectConflicts` detectar que new_uuid já tem rows em TODAS as colunas alvo, emitir aviso "migração já parece ter sido executada — use `--rollback` ou confirme com `--force`".

### Prioridade 4 — CLI `--resume` flag

Expor `SyncOptions.resumeFrom` como flag `--resume <checkpoint-file>` em `sync-users`. Já existe a lógica em `executeSyncPlan` — só falta o parsing no CLI.

### Prioridade 5 — Release v0.4.0

Após E2E validado, bumpar para v0.4.0 e fazer release. O CI está funcionando (release.yml com `npm publish --access public`).

---

## 12. Melhorias futuras opcionais (backlog)

- **Suporte a `--extra-columns` na TUI** — hoje hardcoded em `useSyncOp`
- **Relatório de auditoria por usuário** — quantas linhas foram migradas por email
- **Suporte a múltiplos projetos** — migrar de múltiplas fontes para um novo projeto
- **Dry-run incremental** — re-executar discovery sem resetar o wizard
- **Progress bar real na TUI** — hoje é log ao vivo; poderia ser barra de progresso com ETA
- **Integração com Supabase CLI** — `supabase db dump` como alternativa ao backup JSON
- **Webhook notify** — notificar endpoint após migração completa (para CI/CD)

---

## 13. Snapshot técnico atual

```
lovable-migrate v0.3.3
─────────────────────────────────────────────────────────────────────
Código:         191 arquivos TypeScript/TSX em src/
Testes:         22 arquivos de teste, 336 testes, 100% passando
TypeScript:     0 erros (src/ e test/)
npm:            publicado — https://www.npmjs.com/package/lovable-migrate
Versões npm:    0.3.0, 0.3.3 (0.3.1, 0.3.2 nunca publicados corretamente)
Node:           >= 18.x necessário (AbortSignal, fetch nativo)
Dependências:   @supabase/supabase-js ^2.45, Ink v3.2.0, Fastify, Commander
─────────────────────────────────────────────────────────────────────
Fases pipeline: 11/11 implementadas (analyze→cicd→execute→runtime→remote→sync)
API HTTP:       Fastify em src/server/ — thin layer, sem lógica de domínio
TUI:            Ink v3.2.0, React 17 — 8 telas do wizard sync
sync-users:     4 versões (v1→v4), hardened, testado com mocks
─────────────────────────────────────────────────────────────────────
O QUE ESTÁ PRONTO PARA PRODUÇÃO:
  ✅ Pipeline completo de análise/migração/deploy
  ✅ API HTTP /analyze, /plan, /validate, /migrate, /deploy, /sync, /remote
  ✅ CLI com todos os comandos
  ✅ sync-users: validação, discovery, backup, rollback, checkpoint
  ✅ sync-ui: wizard TUI completo
  ✅ Timeouts, retry, concorrência, key masking
  ✅ Testes unitários e de integração (mocked)
  ✅ TEST_PLAN.md com 60+ cenários de validação
  ✅ Release pipeline (GitHub Actions → npm publish)

O QUE AINDA NÃO ESTÁ PRONTO:
  ❌ Validação E2E com Supabase real (nenhum teste tocou banco real)
  ❌ TUI sem persistência de sessão (crash perde contexto)
  ❌ Idempotência não documentada no código (só em TEST_PLAN.md)
  ❌ CLI --resume flag não exposta (lógica existe, parsing não)
  ❌ Input masking de service key na TUI
```

---

## 14. Como retomar

### Setup rápido

```bash
git clone <repo>
cd lovable-migrate
npm install
npm run typecheck        # deve mostrar: (saída vazia) = 0 erros
npm test                 # deve mostrar: 336 passed
```

### Onde está tudo

| Quero... | Arquivo |
|---|---|
| Entender o sync | `src/sync/index.ts` — orquestrador principal |
| Ver os tipos | `src/sync/types.ts` |
| Testar com banco real | Seguir `TEST_PLAN.md` seção 2 (Smoke Tests) |
| Adicionar novo timeout | `src/sync/utils/timeout.ts` — adicionar em `DEFAULT_TIMEOUTS` |
| Adicionar novo retry | `src/sync/utils/retry.ts` — ajustar `RETRYABLE_MSG` se necessário |
| Adicionar nova tela TUI | `src/sync/tui/screens/` + registrar em `src/sync/tui/app.tsx` |
| Rodar o benchmark | `npx ts-node src/sync/benchmark/runner.ts --latency 50 --concurrency 20` |
| Fazer release | `npm version patch && git push --tags` (CI publica automaticamente) |

### Convenções do projeto (NUNCA quebrar)

- `ProjectFile.relativePath` sempre usa `/` (forward slash), mesmo no Windows
- `ProjectContext` é imutável — sempre `{ ...ctx, newField }`, nunca mutar
- Lógica de domínio nunca em telas TUI — sempre em `usePipeline` ou engine
- Saída para usuário em PT-BR; código, variáveis, funções em inglês
- Testes nunca acessam rede ou Docker real
- Toda escrita em disco passa por `writer.ts` no migrator (output do pipeline)

### Atenção especial ao retomar

1. **Ink v3.2.0** — não tem prop `gap` em `<Box>`. Use `marginRight`/`marginBottom`. Ink v4+ é ESM-only e incompatível.
2. **PostgREST cast TypeScript** — queries do Supabase retornam `PostgrestFilterBuilder`, não `Promise`. Use `as unknown as Promise<...>` nos casts.
3. **DEFAULT_TIMEOUTS** tem tipos literais — parâmetros que recebem esses valores precisam de anotação `number` explícita, não inferência do default.
4. **Benchmark** usa simulação — os tempos reais dependem da latência de rede para `*.supabase.co`.

---

## 15. Referências rápidas

```bash
# Comandos de desenvolvimento
npm run build            # compila TypeScript → dist/
npm run dev              # executa CLI via ts-node (sem build)
npm run typecheck        # verifica tipos src/
npm run typecheck:test   # verifica tipos test/
npm test                 # suite completa (336 testes)
npm run test:watch       # modo interativo
npm run test:snapshots   # atualiza snapshots

# sync-users
npm run dev -- sync-users --help
npm run dev -- sync-users --old-url ... --new-url ... --dry-run

# sync-ui
npm run dev -- sync-ui

# benchmark
npx ts-node src/sync/benchmark/runner.ts --latency 20 --concurrency 10
```

```
Arquivos de referência desta sessão:
  HANDOFF.md       ← este arquivo
  TEST_PLAN.md     ← plano de validação E2E completo
  CLAUDE.md        ← instruções permanentes do projeto
  docs/            ← registries.md, tui.md, development.md
```

---

*Gerado ao final da sessão de 2026-05-14. Próxima sessão: continuar a partir de "Prioridade 1 — Validação E2E real".*
