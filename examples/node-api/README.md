# node-api — Exemplo lovable-migrate

Backend Node.js + Express + TypeScript sem frontend — demonstra deploy `node-server` para APIs.

## Stack

| Item | Tecnologia |
|---|---|
| Framework | nenhum (Node.js puro) |
| Build | TypeScript (tsc) |
| Linguagem | TypeScript |
| Package manager | npm |

## Migrar com lovable-migrate

```bash
lovable-migrate analyze ./examples/node-api
lovable-migrate deploy ./examples/node-api --output ./output/node-api
```

## O que é detectado

```
Framework:        unknown
Build system:     unknown
Package manager:  npm
Linguagem:        typescript
Env vars:         PORT, DATABASE_URL, JWT_SECRET
Deploy strategy:  docker (genérico, confidence: unknown)
```

## Comportamento esperado

O analyzer não detecta "Express" como um framework reconhecido (o suporte é para React/Vue/Svelte/Next). O projeto recebe `framework: unknown` e `deployStrategy: docker` com Dockerfile genérico.

O validator emitirá `FRAMEWORK_UNKNOWN` como crítico — use `--force` para prosseguir.

## Com --force

```bash
lovable-migrate deploy ./examples/node-api \
  --output ./output/node-api \
  --force
```

O Dockerfile gerado será genérico:

```dockerfile
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

FROM node:18-alpine
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY package*.json ./
RUN npm install --production
EXPOSE 3000
CMD ["node", "dist/index.js"]
```

## Próximas versões

Suporte a `framework: express` (com deploy strategy `node-server` dedicada) está planejado para versões futuras.
