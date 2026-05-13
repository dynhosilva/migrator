# Launch Assets — lovable-migrate

Copy de lançamento, posicionamento e framing para cada canal.
Assets visuais e specs de imagem: [social-assets.md](social-assets.md).

---

## One-sentence pitch

> "lovable-migrate analisa qualquer projeto exportado do Lovable.dev e gera automaticamente o Dockerfile, GitHub Actions e plano de deploy — sem tocar no projeto original."

**Versão ultra-curta (para bio/tagline):**
> "De Lovable.dev para self-hosted em um comando."

**Versão técnica:**
> "CLI open-source que transforma um export do Lovable.dev em infraestrutura completa: detecta stack, gera Dockerfile + GitHub Actions + plano de execução remota, deterministicamente."

---

## Before/after framing

| Antes | Depois |
|---|---|
| Abrir o ZIP do Lovable.dev e perguntar "por onde começo?" | `npx lovable-migrate demo` — vê o que seria gerado em 15 segundos |
| Escrever Dockerfile à mão sem saber se o projeto é SPA ou SSR | Dockerfile gerado adaptado ao framework detectado automaticamente |
| Configurar GitHub Actions do zero | `ci.yml` + `release.yml` prontos, com matrix Node [20, 22] e npm cache |
| Lembrar de executar migrations do Supabase | Checklist gerado com cada passo em ordem, incluindo Edge Functions |
| Deploy SSH manual: rsync + docker build + docker compose up | `execution-plan.json` + `remote-execution-plan.json` com os comandos exatos |

---

## Tweet principal (lançamento)

```
Migrei do Lovable.dev para self-hosted em um comando.

npx lovable-migrate demo

↳ Detecta React, Supabase, Tailwind, shadcn/ui
↳ Gera Dockerfile + GitHub Actions (CI + release)
↳ Gera checklist do Supabase: auth, storage, migrations, edge functions
↳ Planeja deploy remoto (SSH + rsync)

Sem tocar no projeto original. Open source.

github.com/dynhosilva/migrator
```

**Variante curta (com screenshot):**
```
Do Lovable.dev para produção em um comando.

npx lovable-migrate demo

Detecta tudo. Gera tudo. Não modifica nada.

🔗 github.com/dynhosilva/migrator
```

**Variante técnica:**
```
Construí uma engine de migração para projetos exportados do Lovable.dev.

Pipeline de 9 fases:
analyze → plan → validate → migrate → deploy
→ cicd → execute → runtime → remote

272 testes. Deterministico. Open source.

npx lovable-migrate demo
```

---

## Product Hunt

### Tagline (60 chars)
```
Migre projetos Lovable.dev para self-hosted em 1 comando
```

### Tagline alternativa (mais específica)
```
Dockerfile + GitHub Actions + plano Supabase — automático
```

### Description (Product Hunt body)

```
Você exportou seu projeto do Lovable.dev. E agora?

lovable-migrate analisa o código, detecta o que você usa 
(React, Supabase, Tailwind, shadcn/ui) e gera tudo que 
você precisaria configurar manualmente:

• Dockerfile multi-stage adaptado ao seu framework
• docker-compose com healthcheck e volumes
• GitHub Actions: CI completo + release automático
• .env.example com todas as variáveis detectadas
• Checklist de migração do Supabase (auth, storage, 
  migrations, edge functions — em ordem)
• Plano de execução remota (SSH + rsync)

Experimente sem instalar nada:
  npx lovable-migrate demo

O projeto original nunca é modificado.
Tudo vai para um diretório de saída separado.
```

### Primeiro comentário (PH)

```
Oi! Criei o lovable-migrate para resolver um problema 
que tive ao exportar meu primeiro projeto do Lovable.dev: 
o ZIP tem o código, mas não tem nada de infraestrutura.

O "demo" (npx lovable-migrate demo) roda contra um projeto 
embutido — React + Vite + Supabase + TypeScript — para 
mostrar o que seria gerado sem precisar do seu projeto 
local.

O que mais me orgulha: o output é deterministico. 
Mesmo input → mesmo Dockerfile e YAML, sempre. 
272 testes verificam isso.

Feedback e PRs bem-vindos!
```

---

## GitHub social preview (og:image)

**Texto sugerido para a imagem 1280×640:**

```
lovable-migrate

De Lovable.dev para produção em um comando.

npx lovable-migrate demo

[terminal screenshot com ✓ Auth · ✓ Storage · ✓ Realtime]
```

**Spec do asset:** `social-og.png` — 1200×630px, fundo `#1a1b26` (Tokyo Night), terminal centralizado com padding 40px, fonte JetBrains Mono.

---

## YouTube thumbnail framing

**Headline principal (grande, centro):**
```
Do Lovable.dev
para produção
```

**Sub-headline (menor):**
```
em um comando
```

**Elemento visual:** metade da tela mostra o terminal com a seção de artefatos (✓ Dockerfile · ✓ ci.yml · ✓ release.yml sobre fundo escuro).

**CTA no rodapé:**
```
npx lovable-migrate demo
```

**Paleta:** fundo `#0d1117` (GitHub dark), texto branco, checkmarks em `#4ade80` (verde), destaque em `#38bdf8` (azul Tailwind).

**Proporção:** 16:9 — 1280×720px.

---

## Hacker News (Show HN)

### Título
```
Show HN: lovable-migrate – migração automática de projetos Lovable.dev para self-hosted
```

### Comentário de abertura

```
Contexto: o Lovable.dev exporta projetos React+Vite+Supabase como ZIP. 
Colocar isso em produção significa configurar Dockerfile, GitHub Actions, 
variáveis de ambiente, migrations do Supabase, Edge Functions — manualmente.

Construí o lovable-migrate para automatizar isso.

Demo zero-fricção (sem instalar, sem conta):
  npx lovable-migrate demo

O que gera para um projeto React+Vite+Supabase:
- Dockerfile multi-stage nginx:alpine
- docker-compose com healthcheck
- ci.yml + release.yml (GitHub Actions)
- .env.example documentado
- Checklist de migração do Supabase em ordem
- Plano de execução remota (SSH + rsync)

Internamente: pipeline de 9 fases, cada uma pura e testável.
272 testes. Output deterministico.

Tudo open source: github.com/dynhosilva/migrator

Feliz em responder perguntas sobre a arquitetura.
```

---

## Discord / Slack (comunidades de developers)

```
Ei — fiz uma ferramenta pra quem usa ou saiu do Lovable.dev:

npx lovable-migrate demo

Roda em segundos e mostra o Dockerfile + GitHub Actions + 
plano de migração do Supabase que seria gerado pro seu projeto.
Zero instalação, zero conta.

Código: github.com/dynhosilva/migrator
```

---

## Checklist de lançamento

- [ ] GIF gravado e publicado em `docs/media/demo-full.gif`
- [ ] README hero com GIF inline (descomente o bloco `<img>`)
- [ ] GitHub social preview configurado (Settings → Social preview)
- [ ] Tag `v0.2.0` criada e CI gerou release automático
- [ ] Tweet principal publicado com screenshot do bloco Supabase
- [ ] Product Hunt submetido com `demo-artifacts.png` como thumbnail
- [ ] Primeira resposta no PH preparada (texto acima)
- [ ] Show HN publicado no horário de pico (seg-sex, 9-12h EST)
