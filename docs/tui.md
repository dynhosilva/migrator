# TUI — Terminal UI

## Iniciar

```bash
lovable-migrate ui
```

## Fluxo de navegação

```
Welcome
  → ProjectSelect      (informar caminho do projeto + diretório de saída)
  → [PhaseRunner]      (analyze + plan executados automaticamente)
  → AnalyzeReview      (revisar stack detectada)
  → PlanReview         (revisar plano + deploy strategy)
  → RiskReview         (revisar riscos por nível)
  → ValidateReview     (ver resultado da validação)
  → ConfirmScreen      (confirmar antes de escrever em disco)
  → [PhaseRunner]      (migrate + deploy + execute + remote)
  → DryRunReview       (revisar plano de execução e dry-run)
  → Summary            (resumo + acesso a artefatos)
    → ArtifactBrowser  (navegar arquivos gerados)
```

## Atalhos de teclado

| Tela | Tecla | Ação |
|---|---|---|
| Welcome | `Enter` / `Space` | Iniciar wizard |
| Welcome | `q` / `Esc` | Sair |
| ProjectSelect | `Tab` | Alternar campo (input ↔ output) |
| ProjectSelect | `Enter` | Confirmar campo |
| ProjectSelect | `Esc` | Voltar |
| Todas (review) | `Enter` / `n` | Próxima fase |
| Todas (review) | `Esc` | Fase anterior |
| ValidateReview | `f` | Ativar `--force` (continuar com issues críticos) |
| ConfirmScreen | `y` / `Y` | Confirmar |
| ConfirmScreen | `n` / `N` / `Esc` | Cancelar |
| ArtifactBrowser | `↑↓` | Navegar arquivos |
| ArtifactBrowser | `Esc` | Fechar |
| Summary | `a` | Abrir navegador de artefatos |
| Summary | `q` / `Esc` | Sair |
| ErrorScreen | `r` / `Enter` | Reiniciar (volta ao Welcome) |
| ErrorScreen | `q` / `Esc` | Sair com código 1 |

## Telas

### Welcome
Apresentação do tool com lista de fases disponíveis.

### ProjectSelect
Formulário de dois campos: caminho do projeto e diretório de saída.
O diretório de saída é preenchido automaticamente como `output/<projeto>` se deixado em branco.

### PhaseRunner
Exibe o progresso das fases em execução com spinner e indicador de status por fase (idle/running/done/failed).

### AnalyzeReview
Mostra framework, build system, package manager, env vars detectadas, presença de Supabase.

### PlanReview
Mostra deploy strategy recomendada, confiança, variáveis obrigatórias, avisos do planner.

### RiskReview
Lista riscos por nível (crítico, médio, baixo) com descrição e mitigação sugerida.

### ValidateReview
Mostra resultado da validação: `safeToMigrate`, issues bloqueantes, avisos. Permite ativar `--force`.

### ConfirmScreen
Pede confirmação explícita antes de qualquer operação que escreve em disco.

### DryRunReview
Mostra o plano de execução (passos) e preview do `dry-run.md` gerado.

### ArtifactBrowser
Navega pelos artefatos gerados:
- `reports/migration-summary.json`
- `docker/deploy-report.json`
- `execution/execution-plan.json`
- `remote/remote-execution-plan.json`
- `runtime/runtime-log.json`

### Summary
Resumo de tudo que foi gerado com contagem de arquivos por fase.

### ErrorScreen
Exibe mensagem de erro com opção de reiniciar o wizard ou sair.

## Filosofia da TUI

A TUI é uma **camada de experiência** — não de domínio. Ela:
- Não contém lógica de negócio
- Chama a engine via `usePipeline` (que encapsula os módulos públicos)
- Não manipula filesystem diretamente
- Exige confirmação explícita antes de qualquer escrita em disco
