# Remote — Planejamento de deploy remoto

## Visão geral

A fase `remote` gera um **plano completo de deploy em servidor remoto** — sem abrir nenhuma conexão SSH real. Todos os artefatos (comandos, scripts, plano de execução) são gerados localmente para revisão humana antes de qualquer execução.

## Iniciar

```bash
lovable-migrate remote /path/to/projeto --output ./output/meu-projeto

# Com configuração SSH explícita
lovable-migrate remote /path/to/projeto \
  --ssh-host meu-servidor.com \
  --ssh-user deploy \
  --ssh-port 22 \
  --ssh-key ~/.ssh/id_rsa \
  --remote-path /opt/minha-app
```

## O que NÃO faz

- Abre conexão SSH real
- Executa comandos no servidor
- Sobe containers ou faz deploy em produção
- Testa conectividade de rede (ping, handshake)
- Modifica arquivos do projeto original

## O que faz

- Valida o perfil do host (OS, Node, Docker, disco) com base nos dados fornecidos
- Valida o formato da configuração SSH (sem testar conectividade)
- Gera lista de arquivos a transferir com tamanhos estimados
- Gera plano de execução com comandos SSH prontos para copiar
- Gera preview legível do deploy para revisão humana

## Configuração SSH

```typescript
interface SshConfig {
  host: string;           // hostname ou IP
  port: number;           // padrão: 22
  user: string;           // usuário de login
  keyPath: string;        // caminho para chave privada (~/.ssh/id_rsa)
  authStrategy: 'key' | 'password';
}
```

A validação verifica apenas **formato** — não testa se o host existe, se a porta está aberta ou se a chave é válida.

## Perfil do host

```typescript
interface HostProfile {
  os: 'ubuntu' | 'debian' | 'centos' | 'alpine' | 'unknown';
  osVersion: string;
  nodeVersion: string | null;      // ex: "20.0.0"
  dockerAvailable: boolean;
  packageManagers: string[];
  availablePorts: number[];
  diskSpaceGB: number;
}
```

**Perfil padrão** (quando não fornecido):
- Ubuntu 22.04, Node v20, Docker disponível, porta 80, 20GB de disco

## Plano de execução

O plano gerado contém **5 passos fixos** na seguinte ordem:

| Passo | Comando | Local | Risco |
|---|---|---|---|
| `create-remote-dirs` | `mkdir -p /opt/app` | remoto | baixo |
| `transfer-files` | `rsync -avz ./output/ user@host:/opt/app/` | local | médio |
| `docker-build-remote` | `ssh user@host docker build ...` | remoto | médio |
| `docker-compose-up` | `ssh user@host docker compose up -d` | remoto | alto |
| `verify-health` | `ssh user@host curl http://localhost:80/` | remoto | baixo |

Os comandos contêm os valores reais (host, usuário, porta, caminhos) resolvidos a partir da configuração fornecida.

## Artefatos gerados

```
output/<project>/
└── remote/
    ├── remote-execution-plan.json  ← passos ordenados com comandos SSH prontos
    ├── remote-dry-run.md           ← preview legível para revisão humana
    └── remote-summary.md           ← status e próximos passos
```

### `remote-execution-plan.json` — estrutura

```json
{
  "project": "meu-projeto",
  "readiness": "ready",
  "steps": [
    {
      "id": "create-remote-dirs",
      "command": "ssh deploy@meu-servidor.com mkdir -p /opt/minha-app",
      "description": "Criar diretórios remotos",
      "remote": true,
      "risk": "low"
    }
  ],
  "preparedAt": "2024-01-01T00:00:00.000Z"
}
```

### `RemoteReadiness`

| Valor | Significado |
|---|---|
| `ready` | Todos os checks passaram |
| `ready-with-warnings` | Avisos presentes mas nenhum bloqueador |
| `blocked` | Issues com severidade `blocker` impedem o deploy |

## Issues e severidades

| Severidade | Significado |
|---|---|
| `blocker` | Impede o deploy — ex: Docker não disponível no host, disco insuficiente |
| `warning` | Requer atenção mas não bloqueia — ex: porta já em uso, Node desatualizado |
| `info` | Contexto relevante — ex: estratégia de deploy detectada |

## Fluxo interno

```
prepareRemote(ctx, outputDir, options?)
  → resolveRemoteConfig(options)      ← aplica defaults
  → RemoteRegistry.run(...)           ← síncrono
      → hostCheck    → HostCompatibilityResult
      → sshCheck     → SshValidationResult
      → transferPlan → TransferPlanResult
      → deployCheck  → DeploymentStrategyResult
      → executionPlan → RemoteExecutionPlanArtifacts
      → dryRun       → RemoteDryRunArtifacts
      → summary      → RemoteSummaryArtifacts
  → collectAllFiles(partial)
  → writeGeneratedFiles(outputDir, files)
```

## API HTTP — `POST /remote`

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

## Adicionar nova task

1. Criar `src/remote/tasks/<nome>.ts` implementando a interface de task
2. Registrar em `src/remote/index.ts` via `registry.register(...)`
3. Tasks têm acesso a `ctx`, `partial`, `outputDir` e `config` (`RemoteConfig`)

```typescript
export function myRemoteTask(taskCtx: RemoteTaskContext): MyResult {
  const { config, ctx } = taskCtx;
  const host = config.sshConfig.host;
  // ... modelagem pura, sem I/O de rede
  return { issues: [], ... };
}
```
