# Screenshots

Esta pasta contém capturas de tela da TUI e do CLI para documentação.

## Gerar com VHS (recomendado para GIFs)

Instale o [VHS](https://github.com/charmbracelet/vhs) e execute:

```bash
vhs assets/gifs/tui-demo.tape
```

## Gerar com asciinema

```bash
# Gravar
asciinema rec assets/screenshots/tui-full.cast

# Converter para SVG estático
svg-term --in assets/screenshots/tui-full.cast \
         --out assets/screenshots/tui-full.svg \
         --window --width 100 --height 30
```

## Convenções de nomenclatura

| Arquivo | Conteúdo |
|---|---|
| `tui-welcome.png` | Tela de boas-vindas da TUI |
| `tui-analyze.png` | Revisão da análise de stack |
| `tui-plan.png` | Revisão do plano de deploy |
| `tui-confirm.png` | Tela de confirmação |
| `tui-summary.png` | Resumo final com artefatos |
| `cli-analyze.png` | Output do `lovable-migrate analyze` |
| `cli-deploy.png` | Output do `lovable-migrate deploy` |
