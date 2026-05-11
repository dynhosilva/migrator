# API HTTP

## Iniciar o servidor

```bash
lovable-migrate server --port 3001
```

## Envelope de resposta

Todas as respostas seguem o mesmo envelope:

```json
{
  "success": true,
  "requestId": "req-abc123-xyz",
  "durationMs": 142,
  "phase": "analyze",
  "data": { ... }
}
```

Em caso de erro:

```json
{
  "success": false,
  "requestId": "req-abc123-xyz",
  "durationMs": 12,
  "error": {
    "code": "INPUT_ERROR",
    "message": "Não foi possível carregar o projeto: pasta não encontrada",
    "phase": "input"
  }
}
```

## Endpoints

### `GET /health`

```json
{ "success": true, "status": "ok", "uptime": 42, "timestamp": "2024-01-01T00:00:00.000Z" }
```

### `GET /version`

```json
{ "success": true, "data": { "version": "0.1.0", "engine": "lovable-migrate" } }
```

### `GET /capabilities`

Lista todas as fases e endpoints disponíveis.

### `POST /analyze`

```json
{ "input": "/path/to/projeto" }
```

Resposta:
```json
{
  "data": {
    "framework": "react",
    "buildSystem": "vite",
    "packageManager": "npm",
    "language": "typescript",
    "envVars": ["VITE_API_URL"],
    "supabase": { "detected": false, "hasEdgeFunctions": false },
    "tailwind": { "detected": true }
  }
}
```

### `POST /plan`

```json
{ "input": "/path/to/projeto" }
```

### `POST /validate`

```json
{ "input": "/path/to/projeto" }
```

Resposta inclui `safeToMigrate: boolean` e `blockingIssues`.

### `POST /migrate`

```json
{
  "input": "/path/to/projeto",
  "output": "./output/meu-projeto",
  "force": false
}
```

Se `safeToMigrate: false` e `force: false`, retorna **409 VALIDATION_BLOCKED**.

### `POST /deploy`

```json
{
  "input": "/path/to/projeto",
  "output": "./output/meu-projeto",
  "force": true
}
```

### `POST /execute`

```json
{
  "input": "/path/to/projeto",
  "output": "./output/meu-projeto",
  "force": true
}
```

### `POST /remote`

```json
{
  "input": "/path/to/projeto",
  "output": "./output/meu-projeto",
  "force": true,
  "sshConfig": {
    "host": "meu-servidor.com",
    "port": 22,
    "user": "deploy",
    "keyPath": "~/.ssh/id_rsa",
    "authStrategy": "key"
  },
  "remotePath": "/opt/app"
}
```

## Códigos de erro

| Código | HTTP | Descrição |
|---|---|---|
| `INPUT_ERROR` | 400 | Input inválido ou projeto não encontrado |
| `SCHEMA_VALIDATION_ERROR` | 400 | Corpo da requisição malformado |
| `VALIDATION_BLOCKED` | 409 | Validação bloqueou — use `force: true` |
| `PIPELINE_ERROR` | 422 | Falha em uma fase do pipeline |
| `SANDBOX_ERROR` | 403 | Comando bloqueado pelo sandbox |
| `RATE_LIMIT_EXCEEDED` | 429 | Limite de requisições atingido |
| `NOT_FOUND` | 404 | Rota não existe |
| `INTERNAL_ERROR` | 500 | Erro interno inesperado |

## Rate limiting

Padrão: **200 requisições/minuto por IP**.
