# Positioning — lovable-migrate

Referência interna de posicionamento para comunicação pública, posts e apresentações.

---

## Tagline oficial

> **Migrate your Lovable.dev projects to self-hosted infrastructure — safely, step by step.**

Versão curta:
> **Self-host your Lovable.dev projects with confidence.**

---

## Elevator pitch (30 segundos)

`lovable-migrate` é uma engine de CLI que pega um projeto exportado do Lovable.dev e gera tudo que você precisa para hospedar ele mesmo: Dockerfile otimizado para sua stack, variáveis de ambiente documentadas, plano de migração do Supabase, e até um plano completo de deploy SSH — tudo sem tocar no projeto original, e com revisão a cada passo antes de qualquer escrita em disco.

---

## Pitch técnico (para desenvolvedores)

Você exportou um projeto do Lovable.dev. Ele roda no ambiente deles. Agora você quer hospedar por conta própria — em VPS, em Docker, com seu próprio Supabase. O problema: tem Dockerfile pra gerar, variáveis de ambiente pra mapear, migrations SQL pra descobrir, edge functions pra copiar, e você não sabe bem a ordem certa de fazer isso.

`lovable-migrate` resolve isso com um pipeline imutável de 8 fases: analisa a stack automaticamente, planeja a estratégia de deploy certa para o seu framework, valida se é seguro prosseguir, gera todos os artefatos — e mostra um dry-run completo antes de executar qualquer coisa.

---

## Público-alvo

### Primário
- **Desenvolvedores que usam Lovable.dev** e querem sair do ambiente gerenciado
- Founders de SaaS que querem controle total da infraestrutura
- Agências que entregam projetos Lovable para clientes com infra própria

### Secundário
- Desenvolvedores que aprendem deploy de projetos React/Next/Vue com Supabase
- Times de DevOps que precisam padronizar migração de projetos

### Anti-público
- Times que já têm pipeline de CI/CD estabelecido — a ferramenta é para quem começa do zero
- Quem não usa Lovable.dev — o analyzer é genérico, mas a ferramenta é otimizada para esse ecossistema

---

## Diferenciais

### 1. Dry-run first
Nenhuma ferramenta de migração mostra o que vai fazer antes de fazer. O `lovable-migrate` gera `dry-run.md` antes de qualquer operação — você revisa, confirma, e só então escreve em disco.

### 2. Projeto original intocável
Toda escrita vai para `--output`. O writer valida por path resolution que nada sai do `outputDir`. Impossível sobrescrever arquivos originais por bug de lógica.

### 3. Sandbox de execução
O runtime executa apenas uma whitelist estrita de processos (`node`, `npm`, `docker`, etc.) com `shell: false`. Sem execução de shell, sem injeção de argumentos.

### 4. Três interfaces, mesma engine
CLI para automação, TUI para onboarding interativo, API HTTP para CI/CD. A lógica de domínio está na engine — transportes são thin layers.

### 5. Conservador por design
O planner prefere `confidence: unknown` e warnings explícitos a falsos positivos. Se não tem dados suficientes, diz. Nunca assume que vai funcionar em silêncio.

### 6. Supabase de primeira classe
Detecção automática de auth, storage, migrations SQL e edge functions. Copia artefatos para a estrutura certa e gera instruções claras para execução manual.

---

## Anti-goals

O que `lovable-migrate` **não** é e nunca pretende ser:

- **Não é um serviço em nuvem** — roda localmente, sem telemetria, sem dados enviados para servidores
- **Não executa SQL automaticamente** — gera artefatos para revisão humana; execução é sempre manual ou explicitamente confirmada
- **Não gerencia segredos** — gera `.env.example` com os nomes das variáveis; os valores são responsabilidade do usuário
- **Não é um CI/CD completo** — gera os ingredientes para um pipeline, não o pipeline em si
- **Não instala Supabase** — assume que o usuário tem conta e projeto Supabase já criado
- **Não faz clone de repositório** — o usuário exporta do Lovable.dev; a ferramenta recebe a pasta

---

## Comparação com alternativas

| Abordagem | Como funciona | Limitação vs. lovable-migrate |
|---|---|---|
| Deploy manual | Escrever Dockerfile na mão, mapear env vars, descobrir migrations | Propenso a erro, sem auditabilidade |
| Scripts bash caseiros | Automatiza parcialmente, específico para cada projeto | Sem análise automática de stack, sem validação |
| Coolify / Dokku | PaaS self-hosted — deploy via git push | Requer infra adicional; não resolve migrations Supabase |
| Railway / Render | PaaS gerenciado | Não é self-hosted; vendor lock-in |
| `lovable-migrate` | Engine de análise + geração de artefatos + dry-run | Requer revisar os artefatos antes de executar (feature, não bug) |

---

## Mensagens por canal

### GitHub README (hero)
> Migrate your Lovable.dev projects to self-hosted infrastructure — safely, step by step.

### npm description
> Migration engine for Lovable.dev exported projects — analyze, plan, validate, migrate, deploy

### Reddit / Show HN
> I built a CLI that takes a Lovable.dev exported project and generates everything you need to self-host it: optimized Dockerfile, env var templates, Supabase migration plan, and a complete SSH deploy plan — with a dry-run before writing anything to disk.

### X/Twitter thread (abertura)
> Just shipped lovable-migrate v0.1.0 — a CLI engine to self-host @lovable_dev projects with confidence.
>
> What it does in one line: analyze your exported project → generate production-ready Docker artifacts → show you a dry-run → write nothing until you confirm.

### Dev.to subtitle
> How I built a pipeline-first CLI that never modifies your project original, always shows a dry-run, and sandboxes every command it executes.

---

## Filosofia de comunicação

- **Honesto sobre limitações**: mencionar que é v0.1.0, que re-sync ainda não existe, que execução Supabase é manual
- **Técnico mas acessível**: explicar o sandbox sem assustar, explicar o dry-run como feature não como limitação
- **Conservador nas promessas**: não prometer "migra em 1 clique" — o processo tem etapas e revisão humana é intencional
- **Open source de verdade**: código público, CHANGELOG honesto, ROADMAP realista, issues abertas para bugs
