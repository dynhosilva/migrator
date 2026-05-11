# CLI — Referência completa

## Flags globais

| Flag | Descrição |
|---|---|
| `-V, --version` | Exibe a versão |
| `-h, --help` | Exibe ajuda |

## Comandos

### `inspect <input>`

Carrega os arquivos do projeto e exibe metadados.

```bash
lovable-migrate inspect /path/to/projeto
lovable-migrate inspect /path/to/projeto.zip
lovable-migrate inspect /path/to/repo/.git
```

Flags: `-v, --verbose`

---

### `analyze <input>`

Detecta stack, framework, build system, env vars, Supabase, etc.

```bash
lovable-migrate analyze /path/to/projeto
lovable-migrate analyze /path/to/projeto --format json
lovable-migrate analyze /path/to/projeto --verbose
```

| Flag | Valores | Padrão |
|---|---|---|
| `-v, --verbose` | — | false |
| `-f, --format` | `terminal`, `json` | `terminal` |

---

### `plan <input>`

Executa analyze + planejamento de migração.

```bash
lovable-migrate plan /path/to/projeto
lovable-migrate plan /path/to/projeto --format json
```

Saída inclui: `deployStrategy`, `infrastructure`, `env`, `risks`, `checklist`, `warnings`.

---

### `validate <input>`

Executa analyze + plan + validação de segurança. Sai com código 1 se `safeToMigrate: false`.

```bash
lovable-migrate validate /path/to/projeto
```

Útil em pipelines CI/CD para bloquear migrações inseguras.

---

### `migrate <input>`

Executa o pipeline completo até a geração de artefatos de migração.

```bash
lovable-migrate migrate /path/to/projeto
lovable-migrate migrate /path/to/projeto --output ./meu-output
lovable-migrate migrate /path/to/projeto --force     # ignora issues críticos
```

| Flag | Descrição | Padrão |
|---|---|---|
| `-o, --output <dir>` | Diretório de saída | `./output/<projeto>` |
| `--force` | Continua com issues críticos | false |

Gera: `env/`, `supabase/` (se detectado), `deploy/`, `reports/`.

---

### `deploy <input>`

Executa migrate + geração de artefatos Docker.

```bash
lovable-migrate deploy /path/to/projeto --output ./output/meu-projeto
```

Gera adicionalmente: `docker/Dockerfile`, `docker/docker-compose.yml`, `docker/.dockerignore`.

---

### `execute <input>`

Executa deploy + verificação de ambiente + geração do plano de execução.

```bash
lovable-migrate execute /path/to/projeto --output ./output/meu-projeto
```

Gera adicionalmente: `execution/execution-plan.json`, `execution/dry-run.md`.

Não executa comandos — apenas verifica pré-condições (node, docker disponíveis).

---

### `remote <input>`

Executa o pipeline completo + planejamento de deploy remoto (sem SSH real).

```bash
lovable-migrate remote /path/to/projeto --output ./output/meu-projeto
lovable-migrate remote /path/to/projeto \
  --ssh-host meu-servidor.com \
  --ssh-user deploy \
  --ssh-port 22
```

| Flag | Descrição |
|---|---|
| `--ssh-host <host>` | Hostname ou IP do servidor |
| `--ssh-port <port>` | Porta SSH (padrão: 22) |
| `--ssh-user <user>` | Usuário SSH |
| `--ssh-key <path>` | Caminho para chave privada |
| `--remote-path <path>` | Caminho remoto de instalação |

Gera adicionalmente: `remote/remote-execution-plan.json`, `remote/remote-dry-run.md`, `remote/remote-summary.md`.

---

### `ui`

Inicia a TUI interativa — wizard completo de migração no terminal.

```bash
lovable-migrate ui
```

Ver [docs/tui.md](tui.md) para detalhes de navegação.

---

### `server`

Inicia o servidor HTTP da API REST.

```bash
lovable-migrate server
lovable-migrate server --port 8080 --host 0.0.0.0
```

| Flag | Padrão |
|---|---|
| `-p, --port <port>` | 3001 |
| `--host <host>` | 127.0.0.1 |

Ver [docs/api.md](api.md) para referência dos endpoints.

## Códigos de saída

| Código | Significado |
|---|---|
| 0 | Sucesso |
| 1 | Erro (validação bloqueou, falha de leitura, etc.) |
