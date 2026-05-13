# GIF Production — lovable-migrate demo

Instruções técnicas precisas para gravar e exportar o GIF oficial do projeto.
Narrativa e storyboard: [gif-storyboard.md](gif-storyboard.md).

---

## Ferramentas necessárias

```bash
# Instalar asciinema (gravação)
brew install asciinema      # macOS
sudo apt install asciinema  # Debian/Ubuntu

# Instalar agg (conversão .cast → .gif)
cargo install agg
# ou via release binária: https://github.com/asciinema/agg/releases
```

---

## Configuração do terminal

| Parâmetro | Valor |
|---|---|
| **Largura** | 80 colunas |
| **Altura** | 40 linhas |
| **Fonte** | JetBrains Mono 14px ou Fira Code 14px |
| **Tema** | One Dark ou Monokai |
| **DPI** | 2x (Retina) se disponível |
| **Padding interno** | 16px |
| **Barra de título** | Oculta ou minimalista |
| **Cursor** | Bloco, ocultar antes da captura |

```bash
# Forçar suporte a cores
export TERM=xterm-256color
export COLORTERM=truecolor
# Garantir 80 colunas exatas
printf '\e[8;40;80t'
```

---

## Passo 1 — Gravar

```bash
# Instalar o pacote globalmente antes da gravação
npm install -g lovable-migrate

# Gravar — o comando já executa o demo diretamente
asciinema rec demo.cast \
  --overwrite \
  --cols 80 \
  --rows 40 \
  --title "lovable-migrate demo" \
  -c "lovable-migrate demo"
```

**Não interagir durante a gravação** — o demo roda automaticamente.

---

## Passo 2 — Verificar o cast

```bash
# Reproduzir para verificar antes de converter
asciinema play demo.cast

# Verificar duração (deve ser 15-25s)
python3 -c "
import json
with open('demo.cast') as f:
  lines = f.readlines()
  events = [json.loads(l) for l in lines if not l.startswith('{')]
  print(f'Duração: {events[-1][0]:.1f}s — {len(events)} eventos')
"
```

---

## Passo 3 — Exportar GIF

### Versão completa (README hero)

```bash
agg demo.cast docs/media/demo-full.gif \
  --theme monokai \
  --font-size 14 \
  --cols 80 \
  --rows 40 \
  --fps-cap 30 \
  --speed 1.0
```

### Versão rápida (Twitter / produto — crop de análise)

Editar `demo.cast` para incluir apenas os primeiros ~10s (banner + análise):

```bash
# Cortar o cast no segundo 10
python3 -c "
import json, sys
with open('demo.cast') as f:
    header = f.readline()
    events = [json.loads(l) for l in f if json.loads(l)[0] <= 10.0]
with open('demo-analysis.cast', 'w') as f:
    f.write(header)
    for e in events:
        f.write(json.dumps(e) + '\n')
print(f'{len(events)} eventos copiados')
"

agg demo-analysis.cast docs/media/demo-analysis.gif \
  --theme monokai \
  --font-size 14 \
  --cols 80 \
  --rows 40 \
  --fps-cap 24
```

### Versão artefatos (Product Hunt thumbnail)

```bash
# Cortar do segundo 12 ao 20 (seção "O que deploy geraria")
python3 -c "
import json
with open('demo.cast') as f:
    header = f.readline()
    all_events = [json.loads(l) for l in f]
events = [(t - 12.0, typ, data) for t, typ, data in all_events if 12.0 <= t <= 22.0]
with open('demo-artifacts.cast', 'w') as f:
    f.write(header)
    for e in events:
        f.write(json.dumps(e) + '\n')
print(f'{len(events)} eventos copiados')
"

agg demo-artifacts.cast docs/media/demo-artifacts.gif \
  --theme monokai \
  --font-size 14 \
  --cols 80 \
  --rows 40 \
  --fps-cap 24
```

---

## Passo 4 — Otimizar (reduzir tamanho)

```bash
# Instalar gifsicle
brew install gifsicle        # macOS
sudo apt install gifsicle    # Linux

# Otimizar — alvo: < 3MB para inline no GitHub
gifsicle --optimize=3 --colors 128 \
  docs/media/demo-full.gif \
  -o docs/media/demo-full.gif

# Verificar tamanho final
ls -lh docs/media/demo-full.gif
```

**Tamanho alvo:**

| Variante | Tamanho máximo | Razão |
|---|---|---|
| `demo-full.gif` | 5 MB | Limite inline do GitHub |
| `demo-analysis.gif` | 2 MB | Twitter/X card |
| `demo-artifacts.gif` | 1.5 MB | Product Hunt thumbnail |

---

## Passo 5 — Extrair PNG estático (hero screenshot)

```bash
# Extrair frame no pico de impacto visual (bloco Supabase, ~7s)
# Requer ImageMagick
convert -coalesce docs/media/demo-full.gif \
  -dispose Background \
  docs/media/frames/frame_%04d.png

# Identificar o frame certo (~7s × fps ≈ frame 210 a 24fps)
# Abrir docs/media/frames/ e escolher o frame com ✓ Auth · ✓ Storage · ✓ Realtime visível

# Copiar o frame escolhido
cp docs/media/frames/frame_0210.png docs/media/demo-analysis.png

# Escalar para 2x (Retina)
convert docs/media/demo-analysis.png \
  -resize 200% \
  docs/media/demo-analysis@2x.png
```

---

## Convenção de nomes dos arquivos

```
docs/media/
├── demo-full.gif              # GIF completo — README hero
├── demo-analysis.gif          # GIF curto — análise (10s)
├── demo-artifacts.gif         # GIF curto — artefatos (8s)
├── demo-analysis.png          # PNG estático — bloco Supabase
├── demo-artifacts.png         # PNG estático — lista de artefatos
├── demo-deploy.png            # PNG estático — output do deploy
├── social-twitter.png         # Recorte 16:9 — Twitter/X
└── social-og.png              # Open Graph — 1200×630
```

---

## Checklist antes de publicar

- [ ] Terminal em exatamente 80 colunas durante a gravação
- [ ] Tema escuro consistente (One Dark ou Monokai)
- [ ] Sem cursor piscando no último frame do GIF
- [ ] `demo-full.gif` abaixo de 5 MB
- [ ] PNG com resolução Retina (@2x suffix)
- [ ] Bloco Supabase (`✓ Auth · ✓ Storage · ✓ Realtime`) visível no hero PNG
- [ ] Nenhuma linha quebrando feio no terminal de 80 colunas

---

## Reprodução para CI (simulado)

Para validar que o output do demo não mudou visualmente, capture um snapshot de texto:

```bash
# Salva output sem cores ANSI para comparar
lovable-migrate demo 2>/dev/null | sed 's/\x1B\[[0-9;]*m//g' > demo-snapshot.txt
diff demo-snapshot.txt test/snapshots/demo-expected.txt
```
