# GitHub — Recomendações de Perfil e Repositório

Configurações recomendadas para maximizar descoberta e credibilidade do repositório.

---

## Repositório — Configurações

### Description (campo About)

```
Migration engine for Lovable.dev exported projects — analyze, Dockerfile, Supabase, TUI wizard
```

Máximo 350 caracteres. Esta descrição aparece em:
- Resultados de busca do GitHub
- Cards de repositório quando linkado
- npm (se sincronizado via `package.json`)

### Website

```
https://github.com/dynhosilva/migrator#readme
```

Até que exista um site dedicado, o README serve como landing page.

### Topics (tags)

Adicionar via GitHub → Settings → Topics (máximo 20, recomendados 8-12):

```
lovable
lovable-dev
migration
self-hosted
docker
supabase
typescript
cli
tui
devtools
deployment
open-source
```

**Por que esses:** `lovable` e `lovable-dev` capturam a audiência primária. `self-hosted` é o maior tópico relacionado no GitHub com comunidade ativa. `tui` diferencia do restante de CLIs. `supabase` captura quem busca ferramentas de Supabase.

---

## README — Social Preview

O GitHub gera automaticamente um preview card quando o repositório é linkado em redes sociais. Para personalizar:

**Settings → Social preview → Upload image**

Dimensões recomendadas: **1280 × 640 px**

Conteúdo sugerido para o banner:
```
┌─────────────────────────────────────────────────────┐
│                                                     │
│   lovable-migrate                                   │
│                                                     │
│   Migrate Lovable.dev projects to self-hosted       │
│   infrastructure — safely, step by step.            │
│                                                     │
│   npm install -g lovable-migrate                    │
│                                                     │
│   ⭐ TypeScript  ⭐ Docker  ⭐ Supabase  ⭐ TUI    │
│                                                     │
└─────────────────────────────────────────────────────┘
```

Ferramentas gratuitas: Canva, Figma, ou `og-image` gerador do Vercel.

---

## README Badges

Os badges atuais no README já estão configurados. Verificar que os links estão corretos após publicação:

```markdown
[![npm version](https://img.shields.io/npm/v/lovable-migrate.svg)](https://www.npmjs.com/package/lovable-migrate)
[![CI](https://github.com/dynhosilva/migrator/actions/workflows/ci.yml/badge.svg)](...)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/node-%3E%3D20-brightgreen.svg)](...)
```

Substituir `your-org` pelo org/username real do GitHub.

---

## GitHub Releases — Configuração

Após criar o primeiro release:

1. Marcar como **Latest release** (automático se for a maior tag semver)
2. Adicionar o GIF demo `assets/gifs/tui-demo.gif` como asset quando disponível
3. O body do release é extraído de `CHANGELOG.md` pelo workflow — revisar antes de publicar

---

## Issues e Discussions

### Labels recomendados

Criar via GitHub → Issues → Labels:

| Label | Cor | Uso |
|---|---|---|
| `bug` | `#d73a4a` | Problemas confirmados |
| `enhancement` | `#a2eeef` | Melhorias de feature existente |
| `new-feature` | `#0075ca` | Features novas |
| `question` | `#d876e3` | Dúvidas de uso |
| `documentation` | `#0075ca` | Docs faltando ou incorreta |
| `good first issue` | `#7057ff` | Issues para novos contribuidores |
| `help wanted` | `#008672` | Issues que aceitam contribuição externa |
| `wontfix` | `#ffffff` | Não será implementado (com explicação) |
| `duplicate` | `#cfd3d7` | Issue duplicada |
| `supabase` | `#3ecf8e` | Relacionado à integração Supabase |
| `tui` | `#fef2c0` | Relacionado à TUI |

### Discussions

Ativar GitHub Discussions para perguntas de uso (evitar poluir Issues com suporte):

**Settings → Features → Discussions ✓**

Categorias sugeridas:
- **Q&A** — dúvidas de uso
- **Ideas** — sugestões sem ser feature request formal
- **Show and tell** — projetos migrados com sucesso

---

## Automação futura

Quando o projeto crescer, considerar:

- **Dependabot** — para manter dependências atualizadas (já suportado por GitHub Actions)
- **Stale bot** — fecha issues inativas após 60 dias sem resposta
- **All Contributors** — tabela automática de contribuidores no README

Não configurar esses agora — ruído prematuro para um projeto v0.1.0.

---

## Checklist de configuração

- [ ] Description atualizada no About
- [ ] Website configurado
- [ ] Topics adicionados (8-12 tags)
- [ ] Social preview image criada e enviada
- [ ] Labels criados
- [ ] Discussions ativadas
- [ ] `your-org` substituído pelo org real em todos os arquivos
- [ ] Badges do README verificados com links corretos
