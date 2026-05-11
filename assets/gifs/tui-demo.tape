# VHS tape — gera demo animada da TUI
# Uso: vhs assets/gifs/tui-demo.tape

Output assets/gifs/tui-demo.gif

Set Shell "bash"
Set FontSize 14
Set Width 1200
Set Height 700
Set Theme "Dracula"

# Iniciar a TUI
Type "lovable-migrate ui"
Enter
Sleep 1s

# Navegar pela tela de boas-vindas
Sleep 2s
Enter

# Informar caminho do projeto
Type "./examples/strat-forge-pro"
Enter
Sleep 500ms
Enter

# Aguardar análise
Sleep 4s

# Navegar pela revisão
Enter
Sleep 500ms
Enter
Sleep 500ms
Enter
Sleep 500ms
Enter

# Confirmar migração
Type "y"
Sleep 4s

# Ver resumo
Sleep 2s
