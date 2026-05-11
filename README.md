# lovable-migrate

Engine de migração para projetos exportados do [Lovable.dev](https://lovable.dev).

Automatiza análise, planejamento, validação, geração de artefatos Docker, planejamento de deploy remoto e execução controlada — tudo a partir de um único CLI.

## Instalação

```bash
# Global (recomendado)
npm install -g lovable-migrate

# Execução direta (sem instalação)
npx lovable-migrate --help
```

**Requisito:** Node.js >= 18.0.0

## Uso rápido

```bash
# Analisar um projeto Lovable exportado
lovable-migrate analyze /path/to/project

# Pipeline completo (analyze → plan → validate → migrate → deploy → execute)
lovable-migrate deploy /path/to/project --output ./output/meu-projeto

# Wizard interativo (TUI)
lovable-migrate ui

# Servidor HTTP da API
lovable-migrate server --port 3001
```

## Fases do pipeline

| Comando      | Fases executadas                                     |
|---|---|
| `inspect`    | Carregamento de arquivos                             |
| `analyze`    | + Detecção de stack                                  |
| `plan`       | + Planejamento de deploy                             |
| `validate`   | + Validação de segurança                             |
| `migrate`    | + Geração de artefatos (env, SQL, instruções)        |
| `deploy`     | + Geração de Dockerfile + docker-compose             |
| `execute`    | + Verificação de ambiente + plano de execução        |
| `remote`     | + Planejamento de deploy remoto (sem SSH real)       |

## Artefatos gerados

```
output/<projeto>/
├── env/
│   ├── .env.example
│   └── .env.production.example
├── supabase/               ← somente se Supabase detectado
│   ├── migrations/*.sql
│   └── functions/
├── deploy/
│   └── deploy-instructions.md
├── docker/
│   ├── Dockerfile
│   ├── docker-compose.yml
│   └── .dockerignore
├── execution/
│   ├── execution-plan.json
│   └── dry-run.md
├── remote/
│   ├── remote-execution-plan.json
│   └── remote-dry-run.md
└── reports/
    └── migration-summary.json
```

## API HTTP

```bash
lovable-migrate server

# Endpoints disponíveis
GET  /health
GET  /version
GET  /capabilities
POST /analyze    { "input": "/path/to/project" }
POST /plan       { "input": "/path/to/project" }
POST /validate   { "input": "/path/to/project" }
POST /migrate    { "input": "/path/to/project", "output": "./out", "force": false }
POST /deploy     { "input": "/path/to/project", "output": "./out" }
POST /execute    { "input": "/path/to/project", "output": "./out" }
POST /remote     { "input": "/path/to/project", "output": "./out", "sshConfig": {...} }
```

## Documentação

- [Primeiros passos](docs/getting-started.md)
- [Arquitetura](docs/architecture.md)
- [CLI — referência completa](docs/cli.md)
- [API HTTP](docs/api.md)
- [TUI](docs/tui.md)
- [Runtime e execução segura](docs/runtime.md)
- [Deploy remoto](docs/remote.md)
- [Desenvolvimento e contribuição](docs/development.md)

## Licença

MIT
