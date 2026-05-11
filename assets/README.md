# Assets

Recursos visuais do `lovable-migrate` para documentação, README e apresentações.

## Estrutura

```
assets/
├── screenshots/     ← capturas de tela da TUI e CLI
├── diagrams/        ← diagramas de arquitetura e fluxo (Mermaid + PNG)
├── gifs/            ← demos animadas
└── branding/        ← logo, ícones, paleta de cores
```

## Gerar screenshots da TUI

Use [VHS](https://github.com/charmbracelet/vhs) para gerar GIFs a partir de scripts `.tape`:

```bash
# Instalar VHS
brew install vhs   # macOS
# ou: go install github.com/charmbracelet/vhs@latest

# Gerar GIF da TUI
vhs assets/gifs/tui-demo.tape
```

## Gerar screenshots com asciinema

```bash
# Gravar sessão
asciinema rec assets/screenshots/tui-session.cast

# Converter para SVG (para README)
svg-term --in assets/screenshots/tui-session.cast --out assets/screenshots/tui.svg
```

## Diagramas

Os diagramas em `diagrams/` estão em formato [Mermaid](https://mermaid.js.org/). Para renderizar:

```bash
# CLI do Mermaid
npx @mermaid-js/mermaid-cli -i assets/diagrams/pipeline.mmd -o assets/diagrams/pipeline.png
```

Ou use a extensão do VS Code: [Markdown Preview Mermaid Support](https://marketplace.visualstudio.com/items?itemName=bierner.markdown-mermaid).
