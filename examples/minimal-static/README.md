# minimal-static — Exemplo lovable-migrate

Projeto HTML + JavaScript puro, sem framework. Demonstra o comportamento do analyzer com stacks mínimas e o que acontece quando o framework é `unknown`.

## Stack

| Item | Tecnologia |
|---|---|
| Framework | nenhum (HTML + JS puro) |
| Build | nenhum |
| Package manager | npm |

## Migrar com lovable-migrate

```bash
lovable-migrate analyze ./examples/minimal-static
lovable-migrate validate ./examples/minimal-static
```

## O que é detectado

```
Framework:        unknown
Build system:     unknown
Package manager:  npm
Linguagem:        javascript
Tailwind:         ✗
Supabase:         ✗
Deploy strategy:  unknown (confidence: unknown)
```

## Comportamento esperado do validate

O validator emitirá:

```
[FRAMEWORK_UNKNOWN] crítico — framework não detectado
[DEPLOY_STRATEGY_UNKNOWN] crítico — estratégia indeterminada
```

`safeToMigrate: false` — use `--force` para prosseguir mesmo assim.

## Quando isso é útil

Este exemplo serve para:

1. Testar o comportamento do validator com projetos sem framework
2. Entender quais issues são gerados em casos de baixa confiança
3. Verificar que o `--force` funciona para casos onde você sabe o que está fazendo

## Com --force

```bash
lovable-migrate deploy ./examples/minimal-static \
  --output ./output/minimal-static \
  --force
```

O Dockerfile gerado será genérico (node:18-alpine), não otimizado para static.
