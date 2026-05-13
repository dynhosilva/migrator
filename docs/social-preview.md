# Social Preview — lovable-migrate

Specs para a imagem de preview social do projeto no GitHub e em plataformas de compartilhamento.

---

## GitHub Social Preview

**Localização:** Settings → Social Preview → Upload an image

**Arquivo alvo:** `docs/media/social-og.png`

**Especificações técnicas:**
| Campo | Valor |
|---|---|
| Dimensões | 1280×640px |
| Formato | PNG |
| Tamanho máximo | 10 MB |
| Proporção | 2:1 |

**Atenção:** GitHub redimensiona para 1200×600 no feed — projetar para esse tamanho e exportar em 1280×640.

---

## Composição visual

### Layout recomendado

```
┌──────────────────────────────────────────────────────────────────┐
│  [padding 48px]                                                  │
│                                                                  │
│  lovable-migrate              [terminal — lado direito]          │
│  ─────────────────            ✓ Auth · ✓ Storage · ✓ Realtime   │
│  De Lovable.dev para          Migrations   2 arquivos            │
│  produção em um comando.      Edge Functions  send-email         │
│                                              process-payment     │
│  npx lovable-migrate demo                                        │
│  [cyan, monospace]                                               │
│  [padding 48px]                                                  │
└──────────────────────────────────────────────────────────────────┘
```

### Paleta de cores

| Elemento | Cor | Hex |
|---|---|---|
| Fundo | Quase preto | `#0d1117` (GitHub dark) |
| Título | Branco | `#ffffff` |
| Subtítulo | Cinza claro | `#8b949e` |
| Comando demo | Cyan | `#38bdf8` |
| Checkmarks (✓) | Verde | `#4ade80` |
| Labels Supabase | Azul | `#60a5fa` |
| Bordas do terminal | Cinza escuro | `#30363d` |

### Tipografia

| Elemento | Fonte | Tamanho |
|---|---|---|
| `lovable-migrate` (logo) | Inter Bold | 52px |
| Tagline | Inter Regular | 28px |
| Comando demo | JetBrains Mono | 24px |
| Terminal output | JetBrains Mono | 16px |

---

## Open Graph (og:image)

Usado quando links são compartilhados no Twitter, LinkedIn, WhatsApp, Slack.

**Dimensões padrão:** 1200×630px
**Proporção:** 1.91:1

O GitHub usa a Social Preview como og:image automaticamente — usar o mesmo arquivo `social-og.png`, mas verificar se o crop de 1200×630 fica bom (o GitHub pode cortar as bordas).

---

## Mobile crop

Em dispositivos móveis, a imagem é exibida em ~375px de largura. Garantir que o elemento principal (os três checkmarks `✓ Auth · ✓ Storage · ✓ Realtime`) seja legível em 375px.

**Regra:** texto do terminal não deve ser menor que 14px equivalente em 375px.

---

## Compatibilidade dark/light

A maioria das plataformas sociais usa fundo branco ou cinza claro. Um terminal escuro sobre fundo `#0d1117` funciona bem — o contraste entre o terminal e o fundo social é evidente.

**Não usar** fundo totalmente preto (`#000000`) — fica sem profundidade e perde definição na borda.

**Sombra recomendada no terminal:** `box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5)` — cria efeito "floating window" que torna o terminal mais legível sobre fundos variados.

---

## Variantes por plataforma

| Plataforma | Tamanho ideal | Crop | Arquivo |
|---|---|---|---|
| GitHub social preview | 1280×640 | Completo | `social-og.png` |
| Twitter/X card | 1200×675 (16:9) | Central | `social-twitter.png` |
| LinkedIn | 1200×627 | Completo | `social-og.png` |
| Product Hunt | 1270×760 | Terminal centralizado | `social-ph.png` |
| YouTube thumbnail | 1280×720 (16:9) | Terminal + headline | `social-yt.png` |

---

## Checklist antes de publicar

- [ ] `social-og.png` criado em 1280×640
- [ ] Checkmarks verdes visíveis em visualização reduzida (375px)
- [ ] Comando `npx lovable-migrate demo` aparece na imagem
- [ ] Sem texto branco sobre fundo claro em nenhuma variante
- [ ] Upload feito em Settings → Social Preview do repositório
- [ ] Link do repositório testado no Twitter Card Validator
- [ ] Link testado no LinkedIn Post Inspector

---

## Ferramentas sugeridas

| Ferramenta | Uso |
|---|---|
| [Figma](https://figma.com) | Criação do layout vetorial |
| [Shots.so](https://shots.so) | Mock de terminal com device frame |
| [Carbon](https://carbon.now.sh) | Screenshot de código para embeds |
| [Twitter Card Validator](https://cards-dev.twitter.com/validator) | Validar og:image no Twitter |
| [LinkedIn Post Inspector](https://www.linkedin.com/post-inspector/) | Validar og:image no LinkedIn |
