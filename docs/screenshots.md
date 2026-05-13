# Screenshots e Material Visual

Guia para capturar material de demonstração de alta qualidade para o README, redes sociais e apresentações.

---

## Setup do terminal recomendado

### Aplicativo
- **macOS:** iTerm2 ou Terminal nativo com tema escuro
- **Windows:** Windows Terminal com PowerShell ou WSL
- **Linux:** Kitty, Alacritty ou GNOME Terminal

### Configurações
| Parâmetro | Valor recomendado |
|---|---|
| Largura | 80 colunas (não mais — o output foi projetado para isso) |
| Altura | 50 linhas (captura completa do demo) |
| Fonte | JetBrains Mono, Fira Code ou Cascadia Code — 14-16px |
| Tema | Tema escuro: One Dark, Dracula, Tokyo Night, Catppuccin Mocha |
| Padding interno | 16-24px — dá sensação de "floating terminal" |
| Cursor | Sem cursor visível durante a captura |
| Barra de título | Minimalista ou oculta |

### Variáveis de ambiente para captura
```bash
# Garantir cores 256 (padrão na maioria dos terminais modernos)
export TERM=xterm-256color
export COLORTERM=truecolor
```

---

## Screenshots prioritários — o que capturar

### 1. Hero shot — o mais importante

**Comando:** `lovable-migrate demo`
**Recorte:** Banner + Análise completa (Framework, Lovable, Tailwind, Supabase, Rotas, Arquivos críticos)
**Objetivo:** Um screenshot que mostre imediatamente o que a ferramenta detecta.

```bash
lovable-migrate demo
```

Capture as primeiras ~60 linhas — do banner até o final da seção "Supabase".

**Por que este screenshot vende:** Mostra que a ferramenta sabe o que está olhando. Ver `✓ Auth · ✓ Storage · ✓ Realtime` + `2 migrations` + `2 Edge Functions` em um único relance é o momento de "caramba, detectou tudo".

---

### 2. Artifacts shot — o segundo mais importante

**Comando:** `lovable-migrate demo`
**Recorte:** A seção "O que deploy geraria" (final do demo)
**Objetivo:** Mostrar o valor concreto — o que o usuário recebe.

Capture apenas a seção final do demo (após o validador):
```
  ┌──────────────────────────────────────────────────────┐
  │  O que deploy geraria para este projeto              │
  └──────────────────────────────────────────────────────┘
  ...
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  ✓  Análise concluída.
  ...
```

**Por que vende:** O usuário vê exatamente o que vai ganhar antes de instalar qualquer coisa.

---

### 3. Deploy output shot — prova de que funciona

**Comando:** `lovable-migrate deploy ./examples/vite-react --output /tmp/demo-output`
**Recorte:** A seção "Artefatos Docker" + "GitHub Actions"
**Objetivo:** Mostrar o output de produção real.

```bash
lovable-migrate deploy ./examples/vite-react --output /tmp/demo-output
```

**Por que vende:** Prova que o comando realmente gera arquivos úteis.

---

### 4. Análise side-by-side — para README técnico

**Comando:** `lovable-migrate analyze ./examples/next-supabase`
**Recorte:** Relatório completo — stack + Supabase
**Objetivo:** Mostrar a capacidade de detecção em um projeto Next.js com Supabase.

---

## GIF demo — sequência recomendada

### Duração alvo: 20-30 segundos

**Ferramentas:** [Asciinema](https://asciinema.org/) (recomendado) ou [Kap](https://getkap.co/) (macOS)

**Sequência:**

```
1. Prompt limpo aparece                    (0-1s)
2. Usuário digita: npx lovable-migrate demo (1-3s)  
3. Banner aparece                          (3-4s)
4. Relatório de Análise — rola suavemente  (4-12s)
   - Framework, Lovable, Tailwind, Supabase
   - Supabase section com checkmarks
   - Migrations e Edge Functions
5. [ corte — skip do plano e validação ]   
6. Seção "O que deploy geraria"            (12-20s)
   - Lista de artefatos com ✓
7. CTA final                               (20-22s)
8. Cursor pisca no final                   (22-25s)
```

**Com Asciinema:**
```bash
asciinema rec demo.cast --overwrite -c "lovable-migrate demo"
# Depois converter para GIF:
# agg demo.cast demo.gif --theme monokai --font-size 16
```

**Velocidade de reprodução:** 1.5x para o plano/validação, 1x para o resto. Isso mantém o GIF conciso sem perder os checkmarks importantes.

---

## Framing para redes sociais

### Twitter/X — card de imagem

**Recorte ideal:** Banner + análise (do topo até o final de "Supabase")
**Proporção:** 16:9 (Twitter usa 2:1 mas 16:9 funciona bem)
**Dica:** Adicionar sombra ao terminal ("floating window" look) aumenta compartilhamentos
**Caption sugerida:**
```
Migrei do Lovable.dev para self-hosted em um comando.

npx lovable-migrate demo

Detecta React, Supabase, Tailwind, gera Dockerfile + 
GitHub Actions + plano de deploy — sem tocar no projeto original.
```

### LinkedIn — screenshot mais longo

Use o screenshot completo do demo (todas as seções). LinkedIn favorece conteúdo mais detalhado.

### Product Hunt / Hacker News thumbnail

**Recorte:** Apenas o banner + primeiras 10 linhas da análise
**Fundo:** Terminal escuro com padding generoso
**Objetivo:** Aparência de ferramenta premium, não de script de terminal.

---

## Análise de impacto visual — o que funciona melhor

### O que gera mais "wow"

1. **Detecção de Supabase completa** — ver `✓ Auth · ✓ Storage · ✓ Realtime` + migrations + edge functions em um bloco compacto é o maior momento de impacto. Essa é a prova de que a ferramenta realmente entende o projeto.

2. **A seção de artefatos** — ver a lista de 12 arquivos que seriam gerados transforma "ferramenta de análise" em "ferramenta que salva horas de trabalho".

3. **O banner `╔═══...═══╗`** — sinaliza cuidado com a UX. Ferramentas premium têm apresentação.

### O que ainda parece técnico demais (para melhorar no futuro)

- As mensagens de validação com `(rule-id)` entre parênteses — `[CRÍTICO] (env) 4 variável(eis)...` — o `(env)` é ruído para um usuário final.
- O checklist de migração tem 15 itens — valioso mas impressiona menos do que impressiona o usuário técnico.
- `Reports: 1 crítico(s) · 2 aviso(s) · 3 info(s)` — o `(s)` de plural é um tic de código, não de texto.

### O que renderia bem em um YouTube thumbnail

O artifacts section (`✓ Dockerfile · ✓ docker-compose · ✓ ci.yml · ✓ release.yml`) sobre fundo escuro com headline: **"Gerado em 3 segundos"**.

---

## Convenções de nomenclatura dos arquivos

```
docs/media/
├── demo-full.gif              # GIF completo do demo (README hero)
├── demo-analysis.png          # Screenshot: relatório de análise
├── demo-artifacts.png         # Screenshot: seção de artefatos
├── demo-deploy.png            # Screenshot: output do comando deploy
├── social-twitter.png         # Recorte 16:9 para Twitter/X
└── social-og.png              # Open Graph 1200x630 para links
```

---

## Checklist antes de publicar

- [ ] Terminal em 80 colunas exatas
- [ ] Tema escuro consistente em todas as capturas
- [ ] Nenhuma linha de texto quebrando feio
- [ ] Cursor não aparece no GIF
- [ ] Fonte legível em 50% do tamanho original
- [ ] GIF não passa de 5MB (GitHub tem limite para preview inline)
- [ ] PNG com resolução 2x para telas Retina (@2x suffix)
