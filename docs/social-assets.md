# Social Assets — lovable-migrate

Templates, posicionamento e especificações de assets para lançamento.

---

## Posicionamento central

**Tagline principal:**
> "Do Lovable.dev para self-hosted em um comando."

**Tagline alternativa (mais técnica):**
> "Analisa, planeja, gera Dockerfile + GitHub Actions — sem tocar no projeto original."

**Diferencial único:** o usuário vê o que será gerado *antes* de instalar qualquer coisa — `npx lovable-migrate demo` roda contra um projeto embutido, zero fricção.

---

## Twitter / X

### Tweet de lançamento

```
Migrei do Lovable.dev para self-hosted em um comando.

npx lovable-migrate demo

Detecta React, Supabase, Tailwind, gera:
→ Dockerfile + docker-compose
→ GitHub Actions (CI + release)
→ .env.example documentado
→ Checklist de migração do Supabase

Sem tocar no projeto original.

github.com/dynhosilva/migrator
```

**Asset:** `social-twitter.png` — banner + análise (primeiros 60 linhas do demo)  
**Proporção:** 16:9 — 1200×675px

---

### Tweet técnico (segundo wave)

```
Como funciona o lovable-migrate:

1. Detecta framework, build system, package manager
2. Detecta Supabase (Auth / Storage / Realtime / Migrations / Edge Functions)
3. Gera artefatos Docker adaptados ao framework
4. Gera pipeline GitHub Actions determinístico
5. Gera plano de execução remota (SSH + rsync)

Tudo em < 3 segundos. Nada escrito no projeto original.

npx lovable-migrate demo
```

---

### Reply template — quando alguém pergunta "como sai do Lovable?"

```
Tem uma ferramenta open-source pra isso:

npx lovable-migrate demo

Detecta tudo automaticamente (Supabase, Tailwind, rotas) e 
gera Dockerfile + GitHub Actions prontos.

github.com/dynhosilva/migrator
```

---

## LinkedIn

### Post de lançamento (mais longo)

```
Lancei o lovable-migrate — engine de migração para projetos 
exportados do Lovable.dev.

O problema: exportar um projeto do Lovable.dev gera um ZIP 
com código React/Vite/Supabase. Colocar isso em produção 
exige configurar Dockerfile, GitHub Actions, variáveis de 
ambiente, migrations do Supabase, Edge Functions... são horas 
de trabalho repetitivo.

A solução: um único comando que analisa o projeto e gera 
todos esses artefatos automaticamente.

Para ver sem instalar nada:
→ npx lovable-migrate demo

O que é gerado:
✓ Dockerfile otimizado para o framework detectado
✓ docker-compose.yml com variáveis de ambiente
✓ GitHub Actions (CI completo + release automático)
✓ .env.example documentado
✓ Guia de migração do Supabase (migrations + Edge Functions)
✓ Plano de execução remota (SSH + rsync)

Tudo deterministicamente — mesmo input, mesmo output, 
testável em CI.

Open source: github.com/dynhosilva/migrator
```

**Asset:** screenshot completo do demo (todas as seções)

---

## Product Hunt

### Tagline (60 chars max)
```
Migre projetos Lovable.dev para self-hosted em 1 comando
```

### Description
```
lovable-migrate é uma engine CLI que analisa projetos exportados 
do Lovable.dev e gera automaticamente todos os artefatos necessários 
para deploy em produção:

• Dockerfile adaptado ao framework (React/Vite, Next.js)
• docker-compose com stack completa
• GitHub Actions: CI completo + release automático
• .env.example documentado
• Guia de migração do Supabase (Auth, Storage, Migrations, Edge Functions)
• Plano de execução remota (SSH + rsync)

Experimente sem instalar nada:
npx lovable-migrate demo

O projeto original nunca é modificado — tudo vai para outputDir.
```

**Thumbnail:** `demo-artifacts.png` — seção "O que deploy geraria" sobre fundo escuro  
**Gallery:**
1. `demo-analysis.png` — relatório de análise completo
2. `demo-artifacts.png` — lista de artefatos gerados
3. `demo-deploy.png` — output do comando `deploy`

---

## Hacker News (Show HN)

### Título
```
Show HN: lovable-migrate – CLI que migra projetos Lovable.dev para self-hosted
```

### Comentário inicial
```
Contexto: o Lovable.dev gera projetos React+Vite+Supabase e permite exportar 
o código. O problema é que "exportar" ainda significa configurar Dockerfile, 
CI, variáveis de ambiente, migrations... manualmente.

O lovable-migrate resolve isso:

  npx lovable-migrate demo

Roda contra um projeto embutido e mostra exatamente o que seria gerado para 
um projeto real — sem instalar nada, sem criar conta.

Internamente: pipeline em 9 fases (analyze → plan → validate → migrate → 
deploy → cicd → execute → runtime → remote), cada fase pura e testável. 
272 testes, snapshots determinísticos.

GitHub: github.com/dynhosilva/migrator
```

---

## Especificações de assets

| Arquivo | Dimensões | Conteúdo | Plataforma |
|---|---|---|---|
| `social-twitter.png` | 1200×675 (16:9) | Banner + análise | Twitter/X |
| `social-og.png` | 1200×630 | Banner + 5 linhas de análise | Open Graph (links) |
| `social-linkedin.png` | 1200×627 | Demo completo (scroll) | LinkedIn |
| `demo-analysis.png` | 1440×900 (@2x) | Análise completa | README + PH |
| `demo-artifacts.png` | 1440×900 (@2x) | Seção de artefatos | README + PH |
| `demo-deploy.png` | 1440×900 (@2x) | Output do `deploy` | README |
| `demo-full.gif` | 1280×720 | GIF 20-30s completo | README hero |

Todos os assets ficam em `docs/media/` (diretório a criar antes das capturas).

---

## Convenções de cores para consistência

| Elemento | Hex (aproximado) |
|---|---|
| Fundo do terminal | `#282c34` (One Dark) |
| Texto principal | `#abb2bf` |
| Verde (✓) | `#98c379` |
| Azul (labels) | `#61afef` |
| Amarelo (avisos) | `#e5c07b` |
| Vermelho (crítico) | `#e06c75` |

Use o tema **One Dark** ou **Monokai** — são os temas que melhor representam 
os checkmarks verdes sem saturação excessiva.
