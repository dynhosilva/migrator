# vue-vite — Exemplo lovable-migrate

Exemplo de Vue 3 + Vite + TypeScript — demonstra que o lovable-migrate funciona além de React.

## Stack

| Item | Tecnologia |
|---|---|
| Framework | Vue 3 |
| Build | Vite |
| Linguagem | TypeScript |
| Package manager | npm |

## Migrar com lovable-migrate

```bash
lovable-migrate analyze ./examples/vue-vite
lovable-migrate deploy ./examples/vue-vite --output ./output/vue-vite
```

## O que é detectado

```
Framework:        vue
Build system:     vite
Package manager:  npm
Linguagem:        typescript
Deploy strategy:  static (nginx)
```

## Capacidades demonstradas

- Detecção de Vue 3 via `vue` em dependencies
- Deploy strategy `static` → mesmo Dockerfile nginx do React
- O Dockerfile multi-estágio funciona igualmente para Vue e React (ambos geram `dist/`)
