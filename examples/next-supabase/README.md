# next-supabase — Exemplo lovable-migrate

Exemplo de Next.js com Supabase — demonstra deploy `node-server` e detecção de banco de dados com migration.

## Stack

| Item | Tecnologia |
|---|---|
| Framework | Next.js 14 |
| Build | Next (interno) |
| Linguagem | TypeScript |
| Banco | Supabase (Postgres + Auth) |
| Package manager | npm |

## Migrar com lovable-migrate

```bash
# Analisar
lovable-migrate analyze ./examples/next-supabase

# Deploy completo
lovable-migrate deploy ./examples/next-supabase \
  --output ./output/next-supabase
```

## O que é detectado

```
Framework:        next
Build system:     next
Package manager:  npm
Linguagem:        typescript
Supabase:         ✓
  - Migrations:   1 arquivo SQL
Deploy strategy:  node-server (Node.js 3 fases)
Env vars:         NEXT_PUBLIC_SUPABASE_URL,
                  NEXT_PUBLIC_SUPABASE_ANON_KEY,
                  SUPABASE_SERVICE_ROLE_KEY
```

## Capacidades demonstradas

- Deploy strategy `node-server` → Dockerfile 3-fases (deps/builder/runner)
- Detecção de Supabase via `@supabase/supabase-js`
- Migration SQL copiada para `supabase/migrations/`
- Env vars `NEXT_PUBLIC_*` e `SUPABASE_*` detectadas

## Diferença do Dockerfile gerado

Para projetos Next.js, o Dockerfile usa 3 fases em vez de 2:

```dockerfile
FROM node:18-alpine AS deps     # instala dependências
FROM node:18-alpine AS builder  # executa next build
FROM node:18-alpine AS runner   # imagem mínima de produção
```

Ao contrário do static (React/Vite), não usa nginx — serve na porta 3000 via `next start`.
