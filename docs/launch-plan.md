# Plano de Lançamento — lovable-migrate v0.1.0

**Data alvo:** semana de 2026-05-11  
**Status:** rascunho pré-lançamento

---

## Ordem de execução

O lançamento segue esta sequência estrita — cada etapa desbloqueia a próxima:

```
1. GitHub Release (tag v0.1.0)
        ↓
2. npm publish (acionado pelo CI ao detectar a tag)
        ↓
3. Verificar instalação global
        ↓
4. X/Twitter thread
        ↓
5. Reddit (r/selfhosted + r/webdev)
        ↓
6. Hacker News (Show HN)
        ↓
7. Dev.to artigo técnico
```

O GitHub Release é o ponto de partida — sem ele, o npm não tem versão publicada para referenciar.

---

## Etapa 1 — GitHub Release

### Pré-condições

- [ ] CI verde em `main` (Node 18, 20, 22)
- [ ] `npm run typecheck` passa
- [ ] `npm test` passa (233 testes)
- [ ] `npm run build` gera `dist/` limpo
- [ ] `package.json` com `version: "0.1.0"` confirmado

### Ação

```bash
git tag v0.1.0
git push origin v0.1.0
```

O workflow `release.yml` é acionado automaticamente:
1. Valida semver da tag
2. Roda `npm publish --dry-run` para confirmar
3. Faz `npm publish`
4. Cria GitHub Release com CHANGELOG.md como body

### Conteúdo do GitHub Release

**Título:** `v0.1.0 — First public release`

**Body:** extraído de `CHANGELOG.md` → seção `[0.1.0]`

**Assets:** nenhum binário manual — o pacote npm é o artefato de distribuição.

---

## Etapa 2 — Verificação pós-publish

Aguardar ~2 minutos após o CI publicar, então verificar:

```bash
npm install -g lovable-migrate
lovable-migrate --version   # → 0.1.0
lovable-migrate --help      # → lista de comandos com Examples:
lovable-migrate analyze ./examples/vite-react
lovable-migrate ui          # confirmar TUI inicia
```

Se qualquer verificação falhar: não avançar para canais externos. Publicar hotfix antes.

---

## Etapa 3 — X/Twitter Thread

### Estrutura da thread (7 posts)

**Post 1 — Anúncio (hook)**
```
Lancei o lovable-migrate — uma engine de migração para projetos Lovable.dev.

Se você exportou um projeto do Lovable e quer self-hospedar, 
esse projeto resolve o problema do zero ao deploy.

🧵
```

**Post 2 — O problema**
```
O fluxo típico de quem tenta self-hospedar um projeto Lovable:

❌ Criar Dockerfile na mão sem saber a stack
❌ Descobrir env vars faltando só no deploy
❌ Não saber se tem Supabase, migrations, edge functions...
❌ Rodar npm run build e rezar

lovable-migrate resolve tudo isso antes de tocar em nada.
```

**Post 3 — Demo rápido**
```
3 comandos para ir do projeto ao Dockerfile:

$ npm install -g lovable-migrate

$ lovable-migrate analyze ./meu-projeto
→ detecta stack, Supabase, env vars, rotas

$ lovable-migrate deploy ./meu-projeto --output ./output
→ Dockerfile + docker-compose + instruções completas

Ou use o wizard interativo:
$ lovable-migrate ui
```

**Post 4 — O que detecta**
```
Detecção automática:

✓ React, Vue, Svelte, Next.js
✓ Vite, CRA, Webpack
✓ npm, yarn, pnpm, bun
✓ Supabase Auth + Migrations + Edge Functions
✓ Env vars obrigatórias
✓ Rotas da aplicação

E gera Dockerfile multi-estágio otimizado para cada stack.
```

**Post 5 — Filosofia de segurança**
```
Princípios que guiaram o design:

→ Projeto original NUNCA é modificado
→ Dry-run antes de qualquer escrita
→ Sandbox de execução (whitelist estrita)
→ Validate bloqueia migração insegura por padrão
→ Remote planning sem SSH real

Filosofia: se algo der errado, deve ser reversível.
```

**Post 6 — Stack técnica**
```
Por baixo:

TypeScript strict + 233 testes + Vitest
Ink v3 (TUI) + Fastify (HTTP API)
Pipeline imutável — cada fase retorna novo contexto
Registry pattern — adicionar detector sem tocar orquestrador
CI: Node 18/20/22 + npm publish automático via tag semântica

Open source: github.com/your-org/lovable-migrate
```

**Post 7 — CTA**
```
Se você usa Lovable.dev e quer self-hospedar:

npm install -g lovable-migrate

Issues, feedback e PRs são bem-vindos.
Roadmap inclui: re-sync automático, Supabase CLI, Hostinger deploy.

O que falta para você usar isso hoje?
```

### Horário recomendado
Terça ou quarta-feira entre 9h-11h (horário de Brasília) — maior engajamento para tech PT-BR.

---

## Etapa 4 — Reddit

### r/selfhosted

**Título:**
```
I built a migration engine for Lovable.dev exported projects — 
generates Dockerfile + docker-compose + Supabase migration plan automatically
```

**Body:**
```
Hi r/selfhosted,

I've been working on lovable-migrate, an open-source CLI tool that automates 
the migration of Lovable.dev exported projects to self-hosted infrastructure.

**What it does:**
- Detects stack (React/Vue/Next.js/Svelte + package manager + Supabase)
- Generates optimized multi-stage Dockerfiles per framework
- Copies Supabase migrations + edge functions with deploy instructions
- Validates environment before migrating (blocks on missing env vars)
- Generates dry-run preview before writing anything

**Three interfaces:**
- CLI: `lovable-migrate deploy ./project --output ./output`
- Interactive TUI wizard: `lovable-migrate ui`
- HTTP API for CI/CD integration

**Install:**
```bash
npm install -g lovable-migrate
```

GitHub: [link]
npm: [link]

Curious what the self-hosting community thinks — especially around the Docker 
generation and Supabase integration. Happy to answer questions.
```

### r/webdev

**Título:**
```
Open sourced lovable-migrate: CLI that turns Lovable.dev projects into 
self-hosted Docker deployments automatically
```

**Body:** versão mais curta, foco no DX (developer experience) e no wizard TUI.

### Timing
Postar r/selfhosted primeiro (mais alinhado ao tema). r/webdev 2h depois se o primeiro tiver tração.

---

## Etapa 5 — Hacker News (Show HN)

**Título:**
```
Show HN: lovable-migrate – CLI to migrate Lovable.dev projects to self-hosted Docker
```

**Body (comentário do autor):**
```
I built this because I kept seeing the same pattern: people exporting projects 
from Lovable.dev and then spending hours figuring out the stack, writing 
Dockerfiles by hand, discovering missing env vars only at deploy time.

lovable-migrate automates the full pipeline:
- Analyzes stack (framework, package manager, Supabase integrations)
- Generates optimized multi-stage Dockerfile per framework
- Copies Supabase migrations + edge functions with CLI instructions
- Validates environment before writing anything
- Produces a dry-run preview first

It's pipeline-based with immutable context passing between phases — 
each phase is pure and returns a new context via spread. 
Added a sandbox for the runtime phase (whitelist of allowed executables, 
spawn with shell: false).

TypeScript strict, 233 tests, Ink TUI, Fastify HTTP API.

npm install -g lovable-migrate

[GitHub link] [npm link]
```

### Estratégia HN
- Postar entre 8h-10h EST (horário de San Francisco)
- Responder TODOS os comentários nas primeiras 2 horas — crítico para ranking
- Não defensivo: aceitar feedback técnico diretamente
- Focar nas decisões de design, não nas features

---

## Etapa 6 — Dev.to Artigo

**Título:**
```
How I built a zero-touch migration engine for Lovable.dev projects 
(pipeline architecture + TypeScript strict + 233 tests)
```

**Seções do artigo:**

1. **O problema** — o gap entre "export do Lovable" e "rodando em VPS"
2. **Abordagem** — pipeline imutável, registry pattern, por que não bash scripts
3. **Pipeline walk-through** — cada fase com código real
4. **Ink TUI** — por que v3, CommonJS constraint, navigation flow
5. **Sandbox de runtime** — whitelist, `shell: false`, por que não `exec`
6. **Testes** — snapshot normalization multiplataforma, fixtures somente-leitura
7. **Resultado** — 233 testes, 170kB pacote, 3 interfaces sobre a mesma engine
8. **Próximos passos** — re-sync, Supabase CLI, Hostinger

**Tags Dev.to:** `typescript`, `docker`, `opensource`, `devtools`

**Timing:** publicar 2-3 dias após o HN para capturar audiência diferente.

---

## GIF Demo — Uso nas Redes

O arquivo `assets/gifs/tui-demo.tape` contém o script VHS para gerar o GIF animado da TUI.

**Para gerar (requer VHS instalado):**
```bash
vhs assets/gifs/tui-demo.tape
# → gera assets/gifs/tui-demo.gif
```

**Onde usar:**
- README.md (substituir placeholder quando GIF estiver gerado)
- X/Twitter post 3 (como mídia no tweet do demo)
- Dev.to artigo (como hero image)
- GitHub Release page

**Enquanto o GIF não está gerado:** usar os mockups ASCII de `assets/screenshots/tui-screens.md` como referência visual nos posts.

---

## Monitoramento pós-lançamento

### Métricas a acompanhar (primeira semana)

| Métrica | Onde verificar | Meta v0.1.0 |
|---|---|---|
| npm downloads | npmjs.com/package/lovable-migrate | > 50 |
| GitHub stars | página do repo | > 20 |
| Issues abertas | GitHub Issues | responder em < 24h |
| HN upvotes | Hacker News | > 10 |

### Resposta a issues

- **Bug crítico (instala mas não roda):** hotfix em < 4h + patch publish
- **Bug de output (artefato errado):** resposta em < 24h, fix na semana
- **Feature request:** agradecer, registrar no ROADMAP.md, não prometer prazo
- **Dúvida de uso:** responder com exemplo de comando + link para docs relevante

---

## Rollback

Se npm publish resultar em versão quebrada:

```bash
npm deprecate lovable-migrate@0.1.0 "Use 0.1.1 — critical fix"
# publicar 0.1.1 com fix imediatamente
```

Não usar `npm unpublish` (janela de 72h, confuso para quem já instalou).

---

## Checklist de lançamento

- [ ] CI verde em main
- [ ] `git tag v0.1.0 && git push origin v0.1.0`
- [ ] GitHub Release criado pelo CI
- [ ] `npm install -g lovable-migrate` verificado manualmente
- [ ] X/Twitter thread publicada
- [ ] r/selfhosted postado
- [ ] Hacker News Show HN submetido
- [ ] Dev.to artigo publicado (D+2)
- [ ] GIF demo gerado e adicionado ao README
