# Demo — TUI Flow

Fluxo completo do wizard interativo `lovable-migrate ui`.

## Pré-requisitos

```bash
npm install -g lovable-migrate
# ou em desenvolvimento:
npm run build && node dist/cli.js ui
```

## Iniciando

```bash
lovable-migrate ui
```

---

## Tela 1 — Welcome

```
╔══════════════════════════════════════════════╗
║           lovable-migrate v0.1.0             ║
║                                              ║
║  Engine de migração para projetos            ║
║  exportados do Lovable.dev                   ║
║                                              ║
║  Fases disponíveis:                          ║
║    ◆ analyze    — detecta stack              ║
║    ◆ plan       — gera estratégia            ║
║    ◆ validate   — verifica segurança         ║
║    ◆ migrate    — gera artefatos             ║
║    ◆ deploy     — gera Docker                ║
║    ◆ execute    — plano de execução          ║
║    ◆ remote     — planejamento remoto        ║
║                                              ║
║  Pressione Enter para começar                ║
╚══════════════════════════════════════════════╝
```

**Atalhos:** `Enter`/`Space` → iniciar | `q`/`Esc` → sair

---

## Tela 2 — ProjectSelect

```
Caminho do projeto:
> ./examples/strat-forge-pro█

Diretório de saída:
  ./output/strat-forge-pro    (automático)

Tab → alternar campo | Enter → confirmar | Esc → voltar
```

O diretório de saída é preenchido automaticamente como `output/<nome-do-projeto>`.

---

## Telas 3-4 — PhaseRunner (analyze + plan)

```
◆ analyze    ● running...
◇ plan       idle
◇ validate   idle
◇ migrate    idle
◇ deploy     idle
◇ execute    idle
◇ remote     idle
```

Após conclusão:

```
✓ analyze    done (1.2s)
✓ plan       done (0.3s)
◇ validate   idle
...
```

---

## Tela 5 — AnalyzeReview

```
Stack detectada

Framework:        react
Build system:     vite
Package manager:  bun
Linguagem:        typescript
Tailwind:         ✓ (com shadcn/ui + Radix)
Supabase:         ✓ detectado
  - Auth:         ✓
  - Storage:      ✓
  - Migrations:   5 arquivos
  - Edge fns:     1 (battle)
Env vars:         2 detectadas
  VITE_SUPABASE_URL
  VITE_SUPABASE_ANON_KEY

Enter/n → próximo | Esc → voltar
```

---

## Tela 6 — PlanReview

```
Plano de migração

Estratégia:       static (nginx)
Confiança:        high
Infraestrutura:   requer Supabase

Variáveis obrigatórias:
  ✗ VITE_SUPABASE_URL      (não resolvida)
  ✗ VITE_SUPABASE_ANON_KEY (não resolvida)

Avisos:
  ⚠ Configure as variáveis de ambiente antes do deploy

Enter/n → próximo | Esc → voltar
```

---

## Tela 7 — RiskReview

```
Riscos identificados

CRÍTICO
  ✗ ENV_VARS_UNRESOLVED
    Variáveis de ambiente detectadas mas não configuradas.
    → Preencha o .env.example gerado antes do deploy.

MÉDIO
  ⚠ MIGRATIONS_REQUIRE_STAGING
    Execute as migrations em ambiente de staging primeiro.

BAIXO
  ℹ SUPABASE_AUTH_UNCONFIGURED
    Configure os providers de auth no dashboard Supabase.

Enter/n → próximo | Esc → voltar
```

---

## Tela 8 — ValidateReview

```
Resultado da validação

safeToMigrate: ✗ false

Issues bloqueantes:
  ✗ [ENV_VARS_UNRESOLVED] Variáveis não configuradas

Avisos: 1   Info: 1

Pressione f para ativar --force e continuar mesmo assim.

f → ativar force | Enter/n → próximo | Esc → voltar
```

---

## Tela 9 — ConfirmScreen

```
⚠ Confirmação necessária

Esta ação irá escrever arquivos em:
  ./output/strat-forge-pro/

O projeto original não será modificado.

Confirmar? (y/n)
```

**Atalhos:** `y`/`Y` → confirmar | `n`/`N`/`Esc` → cancelar

---

## Telas 10-11 — PhaseRunner (migrate + deploy + execute + remote)

```
✓ analyze    done
✓ plan       done
✓ validate   done
◆ migrate    ● running...
◇ deploy     idle
◇ execute    idle
◇ remote     idle
```

---

## Tela 12 — DryRunReview

```
Plano de execução

Passos:
  1. npm install                    (projectDir)
  2. npm run build                  (projectDir)
  3. docker build --tag projeto...  (outputDir/docker)
  4. docker compose up -d           (outputDir/docker)

Preview do dry-run:
─────────────────────────────────
# dry-run.md

## Passo 1 — install
  $ npm install
  Diretório: ./examples/strat-forge-pro

## Passo 2 — build
  $ npm run build
  Diretório: ./examples/strat-forge-pro
─────────────────────────────────

Enter/n → próximo | Esc → voltar
```

---

## Tela 13 — Summary

```
Migração concluída ✓

Artefatos gerados:

  env/            2 arquivos
  supabase/       7 arquivos  (5 migrations + 1 fn + 1 README)
  docker/         5 arquivos
  deploy/         2 arquivos
  execution/      2 arquivos
  remote/         3 arquivos
  reports/        2 arquivos

Total: 23 arquivos em ./output/strat-forge-pro/

a → navegar artefatos | q/Esc → sair
```

---

## Tela 14 — ArtifactBrowser

```
Artefatos gerados

  > reports/migration-summary.json
    docker/deploy-report.json
    execution/execution-plan.json
    remote/remote-execution-plan.json
    runtime/runtime-log.json

↑↓ → navegar | Esc → fechar
```
