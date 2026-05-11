# Demo — API Flow

Demonstração completa do uso da API HTTP do `lovable-migrate`.

## Iniciar o servidor

```bash
lovable-migrate server --port 3001
# Server running at http://127.0.0.1:3001
```

---

## Verificar saúde

```bash
curl http://localhost:3001/health
```

```json
{
  "success": true,
  "status": "ok",
  "uptime": 3.42,
  "timestamp": "2026-05-10T23:00:00.000Z"
}
```

---

## Listar capacidades

```bash
curl http://localhost:3001/capabilities
```

```json
{
  "success": true,
  "data": {
    "phases": ["analyze", "plan", "validate", "migrate", "deploy", "execute", "remote"],
    "endpoints": [
      "GET /health",
      "GET /version",
      "GET /capabilities",
      "POST /analyze",
      "POST /plan",
      "POST /validate",
      "POST /migrate",
      "POST /deploy",
      "POST /execute",
      "POST /remote"
    ]
  }
}
```

---

## Analisar um projeto

```bash
curl -X POST http://localhost:3001/analyze \
  -H "Content-Type: application/json" \
  -d '{"input": "./examples/strat-forge-pro"}'
```

```json
{
  "success": true,
  "requestId": "req-a1b2c3",
  "durationMs": 892,
  "phase": "analyze",
  "data": {
    "framework": "react",
    "buildSystem": "vite",
    "packageManager": "bun",
    "language": { "primary": "typescript", "hasTypeScriptConfig": true },
    "tailwind": { "detected": true, "hasShadcn": true, "hasRadix": true },
    "supabase": {
      "detected": true,
      "usesAuth": true,
      "migrations": { "count": 5 },
      "edgeFunctions": { "count": 1, "names": ["battle"] }
    },
    "envVars": ["VITE_SUPABASE_URL", "VITE_SUPABASE_ANON_KEY"]
  }
}
```

---

## Pipeline completo — deploy

```bash
curl -X POST http://localhost:3001/deploy \
  -H "Content-Type: application/json" \
  -d '{
    "input": "./examples/strat-forge-pro",
    "output": "./output/strat-forge-pro",
    "force": true
  }'
```

```json
{
  "success": true,
  "requestId": "req-d4e5f6",
  "durationMs": 4231,
  "phase": "deploy",
  "data": {
    "projectName": "strat-forge-pro",
    "outputDir": "./output/strat-forge-pro",
    "validation": {
      "safeToMigrate": false,
      "blockingIssues": ["ENV_VARS_UNRESOLVED"]
    },
    "migration": {
      "files": 14
    },
    "deploy": {
      "dockerfileStrategy": "static",
      "files": 5
    }
  }
}
```

---

## Caso de erro — validação bloqueada (sem --force)

```bash
curl -X POST http://localhost:3001/migrate \
  -H "Content-Type: application/json" \
  -d '{"input": "./examples/strat-forge-pro", "output": "./output/out", "force": false}'
```

```json
{
  "success": false,
  "requestId": "req-g7h8i9",
  "durationMs": 1102,
  "error": {
    "code": "VALIDATION_BLOCKED",
    "message": "Validação bloqueou a migração. Use force: true para prosseguir.",
    "phase": "validate"
  }
}
```

HTTP 409 — use `"force": true` para continuar.

---

## Integração CI/CD

```yaml
# .github/workflows/validate.yml
- name: Validar projeto antes do merge
  run: |
    lovable-migrate server --port 3001 &
    sleep 2
    
    RESULT=$(curl -s -X POST http://localhost:3001/validate \
      -H "Content-Type: application/json" \
      -d '{"input": "."}')
    
    SAFE=$(echo $RESULT | jq '.data.safeToMigrate')
    
    if [ "$SAFE" != "true" ]; then
      echo "Validação falhou — ver issues bloqueantes"
      echo $RESULT | jq '.data.blockingIssues'
      exit 1
    fi
```

---

## Rate limiting

A API tem limite padrão de **200 requisições/minuto por IP**.

Ao exceder:

```json
{
  "success": false,
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Limite de requisições atingido. Tente novamente em 60 segundos."
  }
}
```

HTTP 429.
