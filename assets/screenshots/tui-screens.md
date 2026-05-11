# TUI Screens — Mockups de referência

Mockups ASCII de alta fidelidade de cada tela da TUI.  
Para screenshots reais, use VHS: `vhs assets/gifs/tui-demo.tape`

---

## Welcome Screen

```
╔══════════════════════════════════════════════════════════╗
║                                                          ║
║   lovable-migrate v0.1.0                                 ║
║                                                          ║
║   Engine de migração para projetos Lovable.dev           ║
║                                                          ║
║   ─────────────────────────────────────────────────      ║
║   Fases disponíveis:                                     ║
║                                                          ║
║   ◆ analyze     detecta stack, framework, Supabase       ║
║   ◆ plan        gera estratégia e riscos                 ║
║   ◆ validate    verifica segurança                       ║
║   ◆ migrate     gera artefatos filesystem                ║
║   ◆ deploy      gera Dockerfile + docker-compose         ║
║   ◆ execute     plano de execução + dry-run              ║
║   ◆ remote      planejamento de deploy remoto            ║
║   ─────────────────────────────────────────────────      ║
║                                                          ║
║   Pressione Enter para começar                           ║
║   q / Esc para sair                                      ║
║                                                          ║
╚══════════════════════════════════════════════════════════╝
```

---

## ProjectSelect

```
╔══════════════════════════════════════════════════════════╗
║   lovable-migrate — Selecionar projeto                   ║
╚══════════════════════════════════════════════════════════╝

  Caminho do projeto:
  ┌──────────────────────────────────────────────────────┐
  │ ./examples/strat-forge-pro█                          │
  └──────────────────────────────────────────────────────┘

  Diretório de saída:
  ┌──────────────────────────────────────────────────────┐
  │ ./output/strat-forge-pro                             │
  └──────────────────────────────────────────────────────┘
  (automático — deixe em branco para usar o padrão)

  Tab → alternar campo   Enter → confirmar   Esc → voltar
```

---

## PhaseRunner — Em execução

```
╔══════════════════════════════════════════════════════════╗
║   lovable-migrate — Executando fases                     ║
╚══════════════════════════════════════════════════════════╝

  ✓  analyze          concluído  (1.2s)
  ●  plan             executando...
  ◇  validate         aguardando
  ◇  migrate          aguardando
  ◇  deploy           aguardando
  ◇  execute          aguardando
  ◇  remote           aguardando
```

---

## AnalyzeReview

```
╔══════════════════════════════════════════════════════════╗
║   Resultado — analyze                                    ║
╚══════════════════════════════════════════════════════════╝

  Projeto            strat-forge-pro
  Framework          react
  Build system       vite
  Package manager    bun
  Linguagem          typescript

  Tailwind           ✓  (shadcn/ui + Radix UI)

  Supabase           ✓ detectado
    Auth             ✓
    Migrations       5 arquivos SQL
    Edge Functions   1  (battle)

  Variáveis de ambiente
    VITE_SUPABASE_PROJECT_ID
    VITE_SUPABASE_PUBLISHABLE_KEY
    VITE_SUPABASE_URL

  Rotas detectadas   10
    /  /login  /register  /game  /battle  ...

  Enter / n → próxima fase    Esc → voltar
```

---

## RiskReview

```
╔══════════════════════════════════════════════════════════╗
║   Resultado — plan / riscos                              ║
╚══════════════════════════════════════════════════════════╝

  Estratégia de deploy   static (nginx)
  Confiança              alta

  ─────────────── RISCOS DETECTADOS ──────────────────────

  CRÍTICO
  ✗  ENV_VARS_UNRESOLVED
     3 variáveis de ambiente obrigatórias não configuradas.
     → Configure VITE_SUPABASE_URL antes do deploy.

  MÉDIO
  ⚠  MIGRATIONS_REQUIRE_STAGING
     Execute migrations em staging antes de produção.
     → Use supabase db push com --db-url de staging.

  INFO
  ℹ  SUPABASE_AUTH_UNCONFIGURED
     Configure providers de auth no dashboard Supabase.

  Enter / n → próxima fase    Esc → voltar
```

---

## ValidateReview

```
╔══════════════════════════════════════════════════════════╗
║   Resultado — validate                                   ║
╚══════════════════════════════════════════════════════════╝

  Regras executadas  7
  Status             ✗ 1 issue(s) crítico(s) — configure antes de migrar
  Dica               Use --force em migrate/deploy para prosseguir mesmo assim

  ── Issues Críticos (bloqueiam migração) ─────────────────

  ✗  [CRÍTICO] (env) 3 variáveis de ambiente não configuradas:
     VITE_SUPABASE_PROJECT_ID, VITE_SUPABASE_PUBLISHABLE_KEY,
     VITE_SUPABASE_URL
     → Template disponível em env/.env.example após migrar.

  ── Avisos ───────────────────────────────────────────────

  ⚠  [AVISO] (migration-safety) Migrations requerem staging
     → Execute em staging antes de produção.

  f → ativar --force e continuar    Enter → próxima fase    Esc → voltar
```

---

## ConfirmScreen

```
╔══════════════════════════════════════════════════════════╗
║   Confirmar migração                                     ║
╚══════════════════════════════════════════════════════════╝

  ⚠  Esta ação irá escrever arquivos em:

     ./output/strat-forge-pro/

  O projeto original NÃO será modificado.
  Todos os artefatos serão gerados no diretório de saída.

  --force ativado: prosseguindo com 1 issue(s) crítico(s).

  Confirmar? (y / n)
```

---

## DryRunReview

```
╔══════════════════════════════════════════════════════════╗
║   Resultado — execute / dry-run                          ║
╚══════════════════════════════════════════════════════════╝

  Plano de execução (4 passos):

  1. install      bun install              (projectDir)
  2. build        bun run build            (projectDir)
  3. dockerBuild  docker build --tag ...   (outputDir)
  4. compose      docker compose up -d     (outputDir)

  ── Preview dry-run.md ───────────────────────────────────

  # Dry Run — strat-forge-pro

  ## Passo 1 — install
    $ bun install
    Diretório: ./examples/strat-forge-pro
    Estimativa: ~30s

  ## Passo 2 — build
    $ bun run build
    Diretório: ./examples/strat-forge-pro
    ──────────────────────────────────────────────────────

  Enter / n → próxima fase    Esc → voltar
```

---

## Summary

```
╔══════════════════════════════════════════════════════════╗
║   Migração concluída ✓                                   ║
╚══════════════════════════════════════════════════════════╝

  Projeto            strat-forge-pro
  Saída              ./output/strat-forge-pro/

  Artefatos gerados:

  env/               2 arquivos   .env.example e .env.production.example
  supabase/          8 arquivos   5 migrations + 1 edge fn + 2 READMEs
  docker/            5 arquivos   Dockerfile + compose + .dockerignore
  deploy/            2 arquivos   instruções + README
  execution/         2 arquivos   execution-plan.json + dry-run.md
  remote/            3 arquivos   remote-plan + dry-run + summary
  reports/           2 arquivos   migration-summary.json + README

  Total              24 arquivos

  a → navegar artefatos    q / Esc → sair
```

---

## ArtifactBrowser

```
╔══════════════════════════════════════════════════════════╗
║   Artefatos gerados                                      ║
╚══════════════════════════════════════════════════════════╝

  > reports/migration-summary.json          ← selecionado
    docker/deploy-report.json
    execution/execution-plan.json
    remote/remote-execution-plan.json
    runtime/runtime-log.json

  ↑ ↓ → navegar    Enter → abrir    Esc → fechar
```

---

## ErrorScreen

```
╔══════════════════════════════════════════════════════════╗
║   ✗ Erro durante a execução                              ║
╚══════════════════════════════════════════════════════════╝

  Fase:    analyze
  Erro:    Não foi possível carregar o projeto: pasta não encontrada.
           Verifique se o caminho existe e tente novamente.

  r / Enter → reiniciar wizard    q / Esc → sair (código 1)
```
