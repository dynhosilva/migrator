# Roadmap

Evolução planejada do `lovable-migrate`. Baseado no que está implementado e nos casos de uso reais identificados com projetos Lovable.dev.

> **Princípio:** cada versão deve ser utilizável e coerente por conta própria. Sem features incompletas em produção.

---

## Concluído — v0.1.0

Pipeline completo de análise → geração de artefatos → planejamento de deploy.

| Módulo | Descrição |
|---|---|
| ✅ Analyze | Detecção de stack, framework, Supabase, env vars, rotas |
| ✅ Plan | Estratégia de deploy, riscos, checklist |
| ✅ Validate | Gate de segurança — bloqueia migrações inseguras |
| ✅ Migrate | Artefatos filesystem (env, SQL, edge functions, instruções) |
| ✅ Deploy | Dockerfile multi-estágio + docker-compose + .dockerignore |
| ✅ Execute | Verificação de ambiente + plano de execução + dry-run |
| ✅ Runtime | Build local controlado (npm install, build, docker build) com sandbox |
| ✅ Remote | Planejamento de deploy remoto sem SSH real |
| ✅ API HTTP | Fastify — 8 endpoints, rate limiting, schema validation |
| ✅ TUI | Wizard interativo — Ink/React, 12 telas |
| ✅ CLI | 10 comandos com flags documentadas |
| ✅ CI/CD | GitHub Actions — Node 18/20/22, release pipeline |
| ✅ Docs | 9 documentos técnicos + README + CONTRIBUTING |

---

## Em avaliação — v0.2.0

### Re-sync com Lovable (`src/sync/`)

Permite re-sincronizar um projeto que já passou pela migração com atualizações do Lovable.dev — sem refazer tudo do zero.

**Casos de uso:**
- Desenvolvedor continua iterando no Lovable após a migração
- Supabase schema mudou — gerar diff de migrations
- Novas edge functions foram adicionadas

**Escopo proposto:**
- Detectar diff entre versão atual e versão migrada
- Gerar patch de artefatos (apenas o que mudou)
- Manter compatibilidade com artefatos v0.1.0

---

## Planejado — v0.3.0

### Supabase CLI integration

Executar migrations automaticamente via Supabase CLI (quando disponível no ambiente).

**Comportamento proposto:**
- Detectar `supabase` CLI na whitelist do runtime
- Executar `supabase db push` no pipeline do runtime
- Reportar resultado em `runtime-log.json`
- Manter dry-run como padrão — execução real requer `--apply`

---

## Planejado — v0.4.0

### Hostinger VPS integration

Deploy automático em VPS Hostinger via API.

**Comportamento proposto:**
- Autenticação via API key (nunca senha hardcoded)
- Criação de VPS, upload de artefatos, docker compose up
- Relatório de deploy com URL pública
- Rollback automático em caso de falha

**Nota:** esta fase requer design cuidadoso de segurança — credenciais, escopo de acesso e auditabilidade.

---

## Planejado — v0.5.0

### GitHub Actions generator

Gerar arquivos `.github/workflows/` prontos para uso com base na stack detectada.

**Comportamento proposto:**
- Workflow de CI (lint, test, build)
- Workflow de CD (build Docker, push para registry, deploy)
- Configurável para GitHub Actions, GitLab CI ou Bitbucket Pipelines

---

## Futuro — v1.0.0

### API estável

Congelar a interface pública da engine (`src/index.ts`), garantindo backward compatibility entre minor versions.

### Executor v2

Executar o plano de execução gerado pelo executor v1 de forma controlada:
- Cada passo com confirmação interativa ou `--yes-all`
- Rollback por passo
- Log estruturado de cada operação

### Migrator v2

Executar migrations Supabase, deployar edge functions e configurar auth — além de gerar artefatos.

---

## Não planejado (por enquanto)

| Item | Motivo |
|---|---|
| Clone automático de repositório GitHub | Escopo creep — o usuário exporta o projeto; não queremos credenciais GitHub na engine |
| Suporte a monorepos | Requer redesign do source loader — avaliado para versão futura |
| UI Web (dashboard) | Fora do escopo — TUI cobre o caso de uso interativo |
| Plugin system | Prematuro — architecture é extensível por design via registry |

---

## Como contribuir com o roadmap

Abra uma [discussion](https://github.com/your-org/lovable-migrate/discussions) com:
- O caso de uso que você quer resolver
- O stack/projeto que você tem em mãos
- O que a ferramenta atual faz ou não faz

Priorizamos por impacto real — não por complexidade técnica.
