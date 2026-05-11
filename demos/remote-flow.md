# Demo — Remote Flow

Planejamento de deploy remoto — sem SSH real, sem conexão de rede.

## O que é gerado

Todos os comandos SSH necessários para fazer deploy em um servidor remoto, prontos para copiar e executar manualmente (ou automatizar via CI).

## Executar

```bash
lovable-migrate remote ./examples/strat-forge-pro \
  --output ./output/strat-forge-pro \
  --ssh-host meu-servidor.com \
  --ssh-user deploy \
  --ssh-port 22 \
  --ssh-key ~/.ssh/id_rsa \
  --remote-path /opt/strat-forge-pro
```

Sem as flags SSH, o plano é gerado com valores padrão (Ubuntu 22.04, Node v20, Docker disponível).

---

## Plano de execução gerado

`output/strat-forge-pro/remote/remote-execution-plan.json`:

```json
{
  "project": "strat-forge-pro",
  "readiness": "ready",
  "remotePath": "/opt/strat-forge-pro",
  "sshConfig": {
    "host": "meu-servidor.com",
    "port": 22,
    "user": "deploy",
    "authStrategy": "key"
  },
  "steps": [
    {
      "id": "create-remote-dirs",
      "command": "ssh -p 22 -i ~/.ssh/id_rsa deploy@meu-servidor.com mkdir -p /opt/strat-forge-pro",
      "description": "Criar diretórios remotos",
      "remote": true,
      "risk": "low"
    },
    {
      "id": "transfer-files",
      "command": "rsync -avz -e 'ssh -p 22 -i ~/.ssh/id_rsa' ./output/strat-forge-pro/ deploy@meu-servidor.com:/opt/strat-forge-pro/",
      "description": "Transferir artefatos para o servidor",
      "remote": false,
      "risk": "medium"
    },
    {
      "id": "docker-build-remote",
      "command": "ssh -p 22 -i ~/.ssh/id_rsa deploy@meu-servidor.com 'cd /opt/strat-forge-pro && docker build --file docker/Dockerfile --tag strat-forge-pro:latest .'",
      "description": "Build da imagem Docker no servidor",
      "remote": true,
      "risk": "medium"
    },
    {
      "id": "docker-compose-up",
      "command": "ssh -p 22 -i ~/.ssh/id_rsa deploy@meu-servidor.com 'cd /opt/strat-forge-pro && docker compose up -d'",
      "description": "Iniciar containers",
      "remote": true,
      "risk": "high"
    },
    {
      "id": "verify-health",
      "command": "ssh -p 22 -i ~/.ssh/id_rsa deploy@meu-servidor.com 'curl -sf http://localhost:80/ && echo OK'",
      "description": "Verificar saúde do serviço",
      "remote": true,
      "risk": "low"
    }
  ],
  "preparedAt": "2026-05-10T23:00:00.000Z"
}
```

---

## Dry-run legível

`output/strat-forge-pro/remote/remote-dry-run.md`:

```markdown
# Remote Dry Run — strat-forge-pro

Servidor: meu-servidor.com:22 (deploy)
Caminho remoto: /opt/strat-forge-pro
Status: ready

## Passo 1 — create-remote-dirs [risco: baixo]

Criar diretórios remotos no servidor.

    ssh -p 22 -i ~/.ssh/id_rsa deploy@meu-servidor.com mkdir -p /opt/strat-forge-pro

## Passo 2 — transfer-files [risco: médio]

Transferir artefatos gerados para o servidor.

    rsync -avz -e 'ssh -p 22 -i ~/.ssh/id_rsa' \
      ./output/strat-forge-pro/ \
      deploy@meu-servidor.com:/opt/strat-forge-pro/

Arquivos a transferir: ~2.4 MB

## Passo 3 — docker-build-remote [risco: médio]
...
```

---

## Validação do host

O plano inclui verificação das capacidades do host (baseado no perfil fornecido ou padrão):

```
✓ OS:     ubuntu 22.04
✓ Node:   v20.0.0 (>= 18 requerido)
✓ Docker: disponível
✓ Porta:  80 disponível
✓ Disco:  20 GB (>= 2 GB requerido)
```

Se algum requisito não for atendido, `readiness` muda para `blocked` e o issue é listado com sugestão de mitigação.

---

## Executar o plano manualmente

Após revisar o dry-run, copie e execute cada comando na ordem:

```bash
# 1. Criar diretórios
ssh deploy@meu-servidor.com mkdir -p /opt/strat-forge-pro

# 2. Transferir artefatos
rsync -avz ./output/strat-forge-pro/ deploy@meu-servidor.com:/opt/strat-forge-pro/

# 3. Build no servidor
ssh deploy@meu-servidor.com 'cd /opt/strat-forge-pro && docker build --tag app:latest .'

# 4. Iniciar
ssh deploy@meu-servidor.com 'cd /opt/strat-forge-pro && docker compose up -d'

# 5. Verificar
ssh deploy@meu-servidor.com 'curl -sf http://localhost:80/'
```

> **Nota:** o `lovable-migrate` nunca executa esses comandos automaticamente. Você controla quando e como o deploy acontece.
