# Onboarding Review — Simulação de usuário novo

Simulação do fluxo completo de um desenvolvedor que acabou de descobrir o `lovable-migrate` e está tentando usá-lo pela primeira vez, do zero.

**Ambiente testado:** Windows 11, Node.js 20, npm 10, PowerShell  
**Data:** 2026-05-11

---

## Fluxo simulado

### Passo 1 — Descoberta e instalação

```bash
npm install -g lovable-migrate
```

**Resultado:** ✅ Funciona. Instalação em ~500ms. Sem erros.

```bash
lovable-migrate --version
# → 0.1.0
```

**Resultado:** ✅ Versão correta retornada imediatamente.

---

### Passo 2 — Exploração inicial

```bash
lovable-migrate --help
```

**Output real:**
```
Usage: lovable-migrate [options] [command]

Migration engine for Lovable.dev exported projects

Options:
  -V, --version    output the version number
  -h, --help       display help for command

Commands:
  inspect          Lista os arquivos de uma fonte
  analyze          Analisa um projeto e exibe relatório
  plan             Analisa e gera plano de migração
  validate         Analisa, planeja e valida
  migrate          Executa pipeline completo até artefatos
  deploy           + artefatos Docker
  execute          + plano de execução
  runtime          + execução local real
  remote           + planejamento de deploy remoto
  ui               Inicia a TUI interativa
  server           Inicia o servidor HTTP da API
```

**Observação:** Um usuário novo provavelmente vai se perguntar "por onde começo?". A hierarquia de comandos (`analyze < plan < validate < migrate < deploy < execute < remote`) não é imediatamente óbvia pelo `--help`. **Fricção detectada:** a relação cumulativa entre comandos não está explícita no help.

**Melhoria sugerida (v0.2.0):** adicionar `Examples:` na saída do `--help`.

---

### Passo 3 — Primeiro uso real: analisar exemplo

```bash
lovable-migrate analyze ./examples/vite-react
```

**Output real:**
```
[info] Loading from local folder: ./examples/vite-react
[info] Loaded 7 files
[info] Analisando 7 arquivo(s)...

  Projeto            vite-react
  Framework          react
  Build system       vite
  Package mgr        npm
  Linguagem          typescript  3 ts · 0 js
  Env vars:          VITE_API_URL, VITE_APP_TITLE
```

**Resultado:** ✅ Detecção correta. Output limpo e bem formatado.

**Observação positiva:** o format de tabela com `┌──┐` é profissional e legível no terminal.

---

### Passo 4 — Projeto real (strat-forge-pro)

```bash
lovable-migrate analyze ./examples/strat-forge-pro
```

**Output real — destaques:**
```
Framework:    react
Build:        vite
Package mgr:  bun
Lovable:      ✓ .lovable/plan.md

Supabase:     ✓ Detectado
  Auth:       ✓
  Migrations: 5 arquivos SQL
  Edge fns:   1 (battle)

Rotas:        10 rotas detectadas
Env vars:     VITE_SUPABASE_PROJECT_ID, VITE_SUPABASE_PUBLISHABLE_KEY, VITE_SUPABASE_URL
```

**Resultado:** ✅ Impressionante. Detecta tudo — Bun, Lovable config, Supabase com migrations e edge functions, todas as rotas.

---

### Passo 5 — Validate com env vars não configuradas

```bash
lovable-migrate validate ./examples/vite-react
```

**Resultado esperado e correto:**
```
Status:    ✗ NÃO SEGURO — 1 issue(s) crítico(s)

[CRÍTICO] 2 variável(eis) de ambiente obrigatória(s) não configuradas:
  VITE_API_URL, VITE_APP_TITLE
  → Configure as variáveis no servidor destino antes de iniciar.
```

**Exit code:** 1 (correto para uso em CI)

**Observação:** O comportamento é correto e intencional — variáveis não configuradas bloqueiam. A mensagem de solução (`→`) é clara.

**Fricção detectada:** um usuário novo pode confundir "NÃO SEGURO" com "meu projeto tem um problema de segurança". A mensagem poderia ser mais clara: "variáveis de ambiente precisam ser preenchidas antes do deploy".

---

### Passo 6 — Deploy com --force

```bash
lovable-migrate deploy ./examples/vite-react \
  --output ./output/vite-react-test \
  --force
```

**Resultado:** ✅ Gera todos os artefatos corretamente:
```
output/vite-react-test/
├── env/.env.example
├── env/.env.production.example
├── docker/Dockerfile
├── docker/docker-compose.yml
├── docker/.dockerignore
├── docker/README.md
├── docker/deploy-report.json
├── deploy/deploy-instructions.md
├── execution/execution-plan.json
├── execution/dry-run.md
└── reports/migration-summary.json
```

**Observação positiva:** O `dry-run.md` é o artefato mais valioso para onboarding — mostra exatamente o que seria executado sem executar nada.

---

### Passo 7 — TUI (wizard interativo)

```bash
lovable-migrate ui
```

**Resultado:** ✅ TUI inicia corretamente com tela de boas-vindas.

**Observação:** Para usuários novos, a TUI é provavelmente o melhor ponto de entrada — guia pelo processo sem precisar memorizar a hierarquia de comandos.

**Fricção detectada:** o `--help` não menciona a TUI como "recomendado para primeiros projetos". O README menciona, mas o help inline não.

---

## Fricções identificadas

### F1 — Hierarquia de comandos não óbvia no --help
**Impacto:** médio  
**Usuário confunde:** qual comando usar para o pipeline completo?  
**Solução sugerida:** adicionar `Examples:` no `--help` mostrando o fluxo típico

### F2 — "NÃO SEGURO" pode soar como vulnerabilidade
**Impacto:** baixo  
**Usuário confunde:** "meu projeto tem problema de segurança" vs "preciso configurar env vars"  
**Solução sugerida:** reformular para "REQUER ATENÇÃO" ou adicionar contexto na mensagem

### F3 — TUI não mencionada como ponto de entrada no --help
**Impacto:** baixo  
**Solução sugerida:** adicionar linha no `--help` indicando `lovable-migrate ui` para uso interativo

### F4 — `--force` não documentado inline
**Impacto:** médio  
**Usuário que recebe `safeToMigrate: false`**: não sabe que pode continuar com `--force`  
**Solução sugerida:** adicionar na saída do validate: "Use --force para continuar mesmo com issues críticos"

---

## Pontos positivos

- ✅ Instalação rápida e sem fricção
- ✅ Output do analyze é profissional e informativo
- ✅ Detecção automática de Supabase (migrations, auth, edge fns) impressiona
- ✅ Artefatos gerados são completos e bem organizados
- ✅ `dry-run.md` é o diferencial mais visível
- ✅ Exit code 1 no validate funciona para CI
- ✅ Mensagens de erro têm sugestão de correção (`→`)
- ✅ TUI funciona sem configuração adicional

---

## Próximos passos recomendados

| Item | Prioridade | Esforço |
|---|---|---|
| Adicionar `Examples:` no --help | Alta | Baixo |
| Mencionar --force na saída do validate | Alta | Baixo |
| Indicar TUI como ponto de entrada no --help | Média | Baixo |
| Reformular mensagem "NÃO SEGURO" | Baixa | Baixo |
| Adicionar `lovable-migrate ui` ao getting-started | Alta | Baixo |
