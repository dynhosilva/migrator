# Release Notes — v0.1.0

**Data:** 2026-05-11  
**Status:** First public release

---

## Destaques

`lovable-migrate v0.1.0` é o primeiro lançamento público de uma engine de migração para projetos exportados do Lovable.dev. O objetivo é permitir que desenvolvedores self-hostem seus projetos com segurança — sem modificar o original, com dry-run antes de qualquer escrita, e com sandbox de execução.

### O que você pode fazer hoje

```bash
npm install -g lovable-migrate

# Analisar a stack do seu projeto Lovable exportado
lovable-migrate analyze ./meu-projeto

# Gerar Dockerfile otimizado + artefatos completos
lovable-migrate deploy ./meu-projeto --output ./output

# Wizard interativo no terminal
lovable-migrate ui

# Servidor HTTP para integração com CI/CD
lovable-migrate server --port 3001
```

---

## Pipeline completo

8 fases implementadas, cada uma adicionando capacidade à anterior:

| Fase | O que faz | Módulo |
|---|---|---|
| **Analyze** | Detecta stack, framework, Supabase, env vars, rotas | `src/analyzer/` |
| **Plan** | Gera estratégia de deploy, riscos, checklist | `src/planner/` |
| **Validate** | Gate de segurança — bloqueia migrações inseguras | `src/validator/` |
| **Migrate** | Gera artefatos filesystem (env, SQL, edge fns, instruções) | `src/migrator/` |
| **Deploy** | Gera Dockerfile multi-estágio + docker-compose + .dockerignore | `src/deploy/` |
| **Execute** | Verifica ambiente + gera plano de execução + dry-run | `src/executor/` |
| **Runtime** | Executa `npm install`, `npm build`, `docker build` com sandbox | `src/runtime/` |
| **Remote** | Plano de deploy SSH completo — sem conexão real | `src/remote/` |

---

## Stacks suportadas

| Framework | Build | Deploy Strategy | Dockerfile |
|---|---|---|---|
| React | Vite, CRA, Webpack | `static` | nginx multi-estágio |
| Vue 3 | Vite | `static` | nginx multi-estágio |
| Svelte/SvelteKit | Vite | `static` | nginx multi-estágio |
| Next.js | Next | `node-server` | node:18 3 fases |
| Node API | — | `docker` | node:18 genérico |
| HTML estático | — | `docker` | node:18 genérico |

Package managers detectados: npm, yarn, pnpm, bun

---

## Integrações Supabase

Detectadas automaticamente:

- **Auth** — arquivos de client com `createClient`
- **Storage** — uso de `storage` no client
- **Realtime** — uso de `channel()` / `on()`
- **Migrations** — arquivos SQL em `supabase/migrations/`
- **Edge Functions** — arquivos em `supabase/functions/`

O migrator copia migrations e edge functions para o diretório de saída e gera instruções para execução manual via Supabase CLI.

---

## Interfaces

### CLI — 10 comandos

```bash
lovable-migrate inspect   # inspeciona arquivos
lovable-migrate analyze   # analisa stack
lovable-migrate plan      # gera plano
lovable-migrate validate  # valida segurança
lovable-migrate migrate   # gera artefatos
lovable-migrate deploy    # + Docker
lovable-migrate execute   # + plano de execução
lovable-migrate runtime   # + execução local
lovable-migrate remote    # + plano SSH
lovable-migrate ui        # wizard TUI
lovable-migrate server    # API HTTP
```

### TUI — Wizard interativo

12 telas com navegação por teclado, revisão de cada fase, e confirmação explícita antes de qualquer escrita em disco. Construída com Ink v3 (compatível com CommonJS).

### API HTTP — Fastify

8 endpoints REST com rate limiting (200 req/min/IP), envelope padronizado, schema validation e 8 códigos de erro estruturados.

---

## Filosofia de segurança

### Imutabilidade do contexto

O `ProjectContext` nunca é mutado. Cada fase retorna um novo objeto via spread. Estado anterior sempre preservado e auditável.

### Projeto original intocável

O writer valida por path resolution que toda escrita fica dentro do `outputDir`. Impossível por lógica de bug sobrescrever arquivos originais.

### Dry-run primeiro

O executor gera `dry-run.md` antes de qualquer execução real. O TUI mostra o dry-run para revisão antes de confirmar.

### Sandbox de runtime

Whitelist estrita de executáveis: `node`, `npm`, `npx`, `pnpm`, `yarn`, `bun`, `docker`.  
`spawn({ shell: false })` — sem interpretação de metacaracteres.  
Null byte blocking nos argumentos.

### Validação explícita

`safeToMigrate: false` bloqueia o pipeline. Use `--force` conscientemente — para casos como env vars ainda não configuradas.

### Remote sem SSH real

A fase remote modela e planeja — nunca abre conexões. Todos os comandos são gerados para execução manual.

---

## Infraestrutura técnica

- **TypeScript strict** — sem `any` não documentado
- **233 testes** — integração, snapshots, TUI, packaging
- **Vitest** — runner com snapshot determinístico multiplataforma
- **GitHub Actions** — CI com Node matrix [18, 20, 22]
- **Release pipeline** — tags semânticas → `npm publish` automático

---

## Limitações conhecidas (v0.1.0)

| Limitação | Planejado para |
|---|---|
| Re-sync com Lovable não implementado | v0.2.0 |
| Supabase CLI não integrado (migrations manuais) | v0.3.0 |
| Sem suporte a monorepos | Avaliando |
| Remote não executa SSH real | Intencional em v0.1.0 |
| `framework: unknown` para Express/Fastify | v0.2.0+ |
| Screenshots reais da TUI pendentes | Pós-launch |

---

## Como contribuir

Ver [CONTRIBUTING.md](../CONTRIBUTING.md) e [ROADMAP.md](../ROADMAP.md).

Issues e discussions: https://github.com/your-org/lovable-migrate

---

## Agradecimentos

Este projeto nasceu da necessidade real de self-hospedar projetos Lovable.dev com confiança — sem scripts bash frágeis, sem descoberta manual de env vars, sem Dockerfiles copiados da internet sem entender a stack.
