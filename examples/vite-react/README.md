# vite-react — Exemplo lovable-migrate

Exemplo mínimo de React + Vite + TypeScript — o caso de uso mais comum de projetos Lovable.dev.

## Stack

| Item | Tecnologia |
|---|---|
| Framework | React 18 |
| Build | Vite |
| Linguagem | TypeScript |
| Package manager | npm |

## Migrar com lovable-migrate

```bash
# Analisar
lovable-migrate analyze ./examples/vite-react

# Deploy completo
lovable-migrate deploy ./examples/vite-react \
  --output ./output/vite-react
```

## O que é detectado

```
Framework:        react
Build system:     vite
Package manager:  npm
Linguagem:        typescript
Tailwind:         ✗
Supabase:         ✗
Env vars:         VITE_API_URL, VITE_APP_TITLE
Deploy strategy:  static (nginx)
```

## Capacidades demonstradas

- Detecção do caso mais simples: React + Vite + TypeScript + npm
- Deploy strategy `static` — Dockerfile com nginx multi-estágio
- Env vars com prefixo `VITE_` detectadas automaticamente
- Geração de `.env.example` e `.env.production.example`

## Artefatos gerados

```
output/vite-react/
├── env/
│   ├── .env.example
│   └── .env.production.example
├── docker/
│   ├── Dockerfile              ← nginx static, serve dist/
│   └── docker-compose.yml
├── deploy/
│   └── deploy-instructions.md
└── reports/
    └── migration-summary.json
```
