# capture-setup.ps1
# Configura o terminal para captura do hero screenshot do lovable-migrate.
# Uso: .\scripts\capture-setup.ps1

# Forcar 80 colunas x 40 linhas (dimensoes exatas do screenshot oficial)
$host.UI.RawUI.WindowSize  = New-Object System.Management.Automation.Host.Size(80, 40)
$host.UI.RawUI.BufferSize  = New-Object System.Management.Automation.Host.Size(80, 9000)

# Limpar o buffer antes da captura
Clear-Host

Write-Host ""
Write-Host "  Terminal configurado: 80 colunas x 40 linhas" -ForegroundColor DarkGray
Write-Host "  Pronto para captura. Executando demo..." -ForegroundColor DarkGray
Write-Host ""

# Rodar o demo
& lovable-migrate demo

Write-Host ""
Write-Host "  Capture agora com:" -ForegroundColor DarkGray
Write-Host "    Windows: Win+Shift+S (recorte)" -ForegroundColor DarkGray
Write-Host "    Mac:     Cmd+Shift+4 (area)" -ForegroundColor DarkGray
Write-Host "  Salvar em: docs\media\demo-analysis.png" -ForegroundColor DarkGray
