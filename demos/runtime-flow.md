# Demo — Runtime Flow

Execução local controlada: `npm install`, `npm run build` e `docker build`.

> O runtime é acionado implicitamente pelo comando `remote`. Para apenas gerar artefatos sem executar, use `deploy`.

## Pré-requisitos

- Node.js >= 20 instalado
- Docker instalado e rodando (para o passo `docker build`)
- Projeto com script `build` no `package.json`

## Executar

```bash
lovable-migrate remote ./examples/strat-forge-pro \
  --output ./output/strat-forge-pro
```

O runtime executa em sequência:

```
[1/4] install    → npm install (ou bun install, etc.)
[2/4] build      → npm run build
[3/4] dockerBuild → docker build
[4/4] artifacts  → valida artefatos gerados
```

---

## Sandbox em ação

Apenas estes executáveis são permitidos:

```
node  npm  npx  pnpm  yarn  bun  docker
```

Tentativa de executar fora da whitelist:

```
SandboxViolationError: Executável "bash" não está na whitelist do runtime.
Permitidos: node, npm, npx, pnpm, yarn, bun, docker
```

---

## Artefatos gerados

```
output/strat-forge-pro/runtime/
├── runtime-log.json      ← CommandResults estruturados
└── runtime-summary.md    ← resumo legível
```

### `runtime-log.json`

```json
{
  "project": "strat-forge-pro",
  "tasks": [
    {
      "task": "install",
      "command": "bun install",
      "exitCode": 0,
      "durationMs": 3120,
      "timedOut": false,
      "stdout": "bun install v1.0.0\n312 packages installed",
      "stderr": ""
    },
    {
      "task": "build",
      "command": "bun run build",
      "exitCode": 0,
      "durationMs": 8400,
      "timedOut": false,
      "stdout": "vite v5.0.0 building for production...\n✓ 1234 modules transformed",
      "stderr": ""
    },
    {
      "task": "dockerBuild",
      "command": "docker build --file ./output/strat-forge-pro/docker/Dockerfile --tag strat-forge-pro:local .",
      "exitCode": 0,
      "durationMs": 42300,
      "timedOut": false,
      "stdout": "Step 1/12 : FROM node:18-alpine AS builder\n...\nSuccessfully built a1b2c3d4e5f6",
      "stderr": ""
    }
  ],
  "readiness": "success",
  "generatedAt": "2026-05-10T23:00:00.000Z"
}
```

### `runtime-summary.md`

```markdown
# Runtime Summary — strat-forge-pro

**Status:** ✓ success
**Executado em:** 2026-05-10T23:00:00.000Z

## Tarefas

| Tarefa | Status | Duração |
|---|---|---|
| install | ✓ ok | 3.1s |
| build | ✓ ok | 8.4s |
| dockerBuild | ✓ ok | 42.3s |
| artifacts | ✓ ok | — |

## Imagem Docker

Imagem criada: `strat-forge-pro:local`

## Próximos passos

1. Configurar variáveis de ambiente em `.env.production`
2. Executar: `docker compose up -d`
3. Verificar: `curl http://localhost:80/`
```

---

## RuntimeReadiness

| Valor | Quando |
|---|---|
| `success` | Todos os comandos concluíram com sucesso |
| `partial` | Alguns passos falharam (ex: docker não instalado) |
| `failed` | Nenhum passo concluiu |

---

## Timeout e truncamento

Cada comando tem timeout padrão de 5 minutos. Saídas maiores que 4096 bytes são truncadas nos logs (o processo continua normalmente).

Para projetos com build lento, o timeout pode ser ajustado em versões futuras da API.
