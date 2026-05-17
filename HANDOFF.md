# HANDOFF.md — lovable-migrate

> **Data da sessão:** 2026-05-16
> **Branch:** `main` (sem commits desta sessão — tudo no working tree)
> **Último commit upstream:** `94dd256 chore: bump version to 0.3.5`
>
> Este documento é o ponto de retomada. Leia do início ao fim antes de escrever qualquer código.
> Substitui handoff anterior (0.3.3 / 2026-05-14).

---

## 1. Estado atual do projeto

### Resumo executivo
- **Engine `lovable-migrate` versão 0.3.5** (em `package.json` — não foi bumpada nesta sessão).
- **Fase 1 do Deploy Assistido** implementada e funcional.
- Novo módulo `src/guide/` produz dois artefatos humanos: `DEPLOY.md` + `CHECKLIST.md`.
- Pipeline antigo intocado — zero quebra de testes ou contratos.
- **432 testes passando em 30 arquivos** (eram 400 antes da sessão; +32 novos).
- **Toda a implementação está no working tree, ainda não comitada.**

### Pipeline atual
```
resolveSource → analyze → plan → validate → migrate → deploy
  → execute → runtime → remote → cicd → [NOVO: guide]
```

O módulo `guide` consome `ctx.analysis`, `ctx.plan` e (quando disponível) `ctx.deploy.docker.exposedPort`. Não tem dependência de runtime/execute/remote — pode rodar logo após `deploy`.

---

## 2. O que foi implementado nesta sessão

### Etapa A — Estratégia e arquitetura (resposta de análise inicial)
Resposta longa entregada com:
- Diagnóstico do gap real entre `remote/dry-run.md` e o usuário não técnico.
- Proposta `deploy-guide` como gerador de pacote humano (NÃO automação SSH).
- Roadmap em 5 fases (MVP → automação total).
- Quick wins, riscos, diferenciais competitivos.
- O que **NÃO** fazer agora.

### Etapa B — Fase 1.A: módulo `src/guide/` + DEPLOY.md generator
- `types.ts`, `registry.ts`, `index.ts` + 3 targets (Hostinger, Generic, fallback).
- `tasks/deploy-doc-generator.ts` — DEPLOY.md em 9 passos numerados, PT-BR, contextual.
- Integração com `ProjectContext` (`withGuide`, campo opcional).
- Comando CLI: `lovable-migrate guide <input> --target --domain --port --remote-path --admin-email`.
- Renderer terminal + JSON.
- 26 testes de integração.

### Etapa C — Fase 1.B: CHECKLIST.md generator
- Tipos novos: `ChecklistPhase`, `ChecklistItem`, `ChecklistSection`, `ChecklistArtifact`, `ChecklistDifficulty`.
- `tasks/checklist-generator.ts` — 10 funções `buildXSection()` puras + renderização markdown isolada.
- **Modelo estruturado** (não só string): preparado para TUI interativa e API HTTP futuras.
- IDs estáveis por item (preparado para persistência de progresso).
- 32 testes (unit + integração + 2 snapshots normalizados).

---

## 3. Arquitetura criada

### Estrutura do módulo
```
src/guide/
├── types.ts                          175 linhas
├── registry.ts                        54 linhas    (GuideRegistry síncrono)
├── index.ts                          194 linhas    (orquestrador + entry points)
├── targets/
│   ├── index.ts                       32 linhas    (resolveTargetProfile + fallback)
│   ├── hostinger.ts                   35 linhas    (perfil hPanel + KVM)
│   └── generic.ts                     33 linhas    (perfil neutro de fallback)
└── tasks/
    ├── deploy-doc-generator.ts       551 linhas    (9 buildStepN + helpers + render)
    └── checklist-generator.ts        641 linhas    (10 buildXSection + renderItem/Section/Header/Footer)
```

### Tipos principais (mental model)
```typescript
GuideOptions   → input do usuário (target, domain, port — todos opcionais)
GuideConfig    → resolvido internamente (defaults aplicados, sempre completo)
GuideTarget    → 'hostinger' | 'digitalocean' | 'aws-lightsail' | 'generic'
GuideTargetProfile → struct de strings PT-BR por provedor (panel, ssh, notes)

GuideState     → resultado da fase, anexado ao ProjectContext
├── deployDoc: DeployDocArtifact          (DEPLOY.md)
└── checklist: ChecklistArtifact          (CHECKLIST.md)
    └── sections: ChecklistSection[]      (modelo estruturado, não só markdown)
        └── items: ChecklistItem[]        (id estável, warning, scriptRef, time, difficulty)
```

### Padrão de extensão (importante para retomada)
Adicionar nova capacidade ao guide = **3 ações mecânicas**:
1. Criar `src/guide/tasks/X-generator.ts` (função pura `(ctx, config) → Artifact`).
2. Adicionar `readonly X: XArtifact` em `GuideState` (`src/guide/types.ts`).
3. Registrar no registry em `index.ts` com `.register({ key: 'X', run: ... })`.

Zero alteração no orquestrador, CLI, ou pipeline.

---

## 4. Decisões técnicas importantes

| # | Decisão | Por quê | Onde |
|---|---|---|---|
| 1 | **Registry síncrono** (não async) | Toda task é pure template — sem I/O exceto `writeGeneratedFiles` no final | `src/guide/registry.ts` |
| 2 | **`GuideOptions` × `GuideConfig` separados** | Usuário passa o mínimo, defaults aplicados antes do registry. Tasks só veem config completa | `src/guide/index.ts:resolveGuideConfig` |
| 3 | **Targets como dados (não código)** | Adicionar provedor = 1 arquivo + 1 linha. Targets desconhecidos caem em `generic` (fallback seguro) | `src/guide/targets/index.ts` |
| 4 | **Builders por seção como funções puras** | Testáveis isoladamente, reordenáveis, reaproveitáveis em outros artefatos | `tasks/*-generator.ts` |
| 5 | **Modelo estruturado para CHECKLIST** | Não é só markdown — `ChecklistSection[]` alimenta TUI, JSON da API, scripts futuros | `tasks/checklist-generator.ts` |
| 6 | **IDs estáveis em itens do checklist** | Preparado para TUI interativa salvar "já marquei `ssl.certbot-run`" | Cada `item('id.x', ...)` |
| 7 | **`scriptRef?` já no tipo de item** | Quando gerar scripts bash, o checklist referencia diretamente o `.sh` correspondente | `ChecklistItem.scriptRef` |
| 8 | **Aliases no boundary público** | `ChecklistItem` colidia com o planner — aliasamos só em `src/index.ts` (`GuideChecklistItem`) | `src/index.ts` |
| 9 | **`estimatedTotalMinutes = max(deployDoc, checklist)`** | `deployDoc` é tempo de leitura, `checklist` é tempo de execução — somar dupla-contaria | `src/guide/index.ts` |
| 10 | **`normalizeOutput` nos snapshots** | Timestamp do rodapé varia. Mesmo padrão dos snapshots de `deploy`, `remote`, etc. | `test/integration/guide-checklist.test.ts` |
| 11 | **`__sectionBuilders` exportado** | Testes unitários por seção sem rodar pipeline inteiro (~ms vs. segundos) | `tasks/checklist-generator.ts` |
| 12 | **Imutabilidade preservada** | `withGuide()` retorna novo ctx via spread. Teste explícito valida | `src/core/index.ts` |

---

## 5. Arquivos novos / modificados

### Novos (não comitados)
```
src/guide/                                    8 arquivos, ~1750 linhas TS
├── types.ts                                  175
├── registry.ts                                54
├── index.ts                                  194
├── targets/index.ts                           32
├── targets/hostinger.ts                       35
├── targets/generic.ts                         33
├── tasks/deploy-doc-generator.ts             551
└── tasks/checklist-generator.ts              641

test/integration/guide.test.ts                328 linhas (26 testes do DEPLOY.md)
test/integration/guide-checklist.test.ts      368 linhas (32 testes do CHECKLIST.md)
test/snapshots/guide-checklist.snap            15 KB (2 snapshots normalizados)

HANDOFF.md                                    (este arquivo)
```

### Modificados (não comitados)
```
src/cli.ts                  +76 linhas   → comando `guide` com flags --target --domain --port --remote-path --admin-email
src/core/types.ts           +4  linhas   → readonly guide?: GuideState
src/core/index.ts           +6  linhas   → withGuide()
src/index.ts                +23 linhas   → exports + aliases (GuideChecklistItem, etc.)
src/output/terminal.ts      +37 linhas   → renderGuide() com contagem de itens
src/output/json.ts          +1  linha    → serializa ctx.guide
test/helpers/pipeline.ts    +19 linhas   → runGuidePipeline()
```

### Não tocados (intencionalmente)
- TUI (`src/tui/`) — Fase 2.
- Server (`src/server/`) — Fase 2.
- Validator/Migrator/Deploy/Executor/Runtime/Remote/Cicd — sem mudanças.

---

## 6. Testes executados nesta sessão

```bash
npm run typecheck                                         # ✅ passa (limpo)
npm run typecheck:test                                    # ✅ passa (limpo)
npx vitest run test/integration/guide.test.ts             # ✅ 26 passed
npx vitest run test/integration/guide-checklist.test.ts   # ✅ 32 passed
npm test                                                   # ✅ 432 passed em 30 files (~6.6s)
```

### Cobertura nova (58 testes)
- **Targets** (5) — resolução, fallback, instruções específicas.
- **Pré-condições** (2) — throw quando falta `analysis`/`plan`.
- **Pipeline react-vite + Hostinger** (12 testes do DEPLOY) — framework, domínio, comandos.
- **Pipeline supabase-project** (2) — hint de Supabase, projectName.
- **Target generic** (1) — conteúdo neutro.
- **Normalização de domínio** (4) — protocolo, slash, null, callout.
- **Imutabilidade** (1) — ctx original não muta.
- **Builders de seção do checklist** (15) — cada `buildXSection()` isoladamente.
- **Composição do checklist** (6) — totais, ordem, checkboxes, tabela.
- **Pipeline + snapshot do checklist** (6 em react-vite, 3 em supabase, 2 sem domínio).

### Validação manual feita
```bash
npm run dev -- guide ./test/fixtures/supabase-project --target hostinger --domain meuapp.com --output ./tmp-checklist
# → Output: 38 itens (33 obrigatórios), ~57 min
# → DEPLOY.md detectou Supabase e listou VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY
# → CHECKLIST.md inclui as 10 seções com ícones, checkboxes, warnings, tempo estimado
```

---

## 7. Estado dos testes

```
Test Files  30 passed (30)
Tests       432 passed (432)
Duration    ~6.6s
```

Sem flakes, sem warnings de TypeScript, sem snapshots desatualizados.

---

## 8. Próximos passos recomendados

### Prioridade 1 — Quick wins da Fase 1.x (1–2 dias cada)
1. **`tasks/script-generator.ts`** — Gera `01-setup-vps.sh` ... `06-health-check.sh` a partir das seções do checklist. Os comandos já estão nos labels — extrair via parsing dos blocos `` ` ``. Popular `ChecklistItem.scriptRef` ao mesmo tempo.
2. **`tasks/nginx-generator.ts`** — Gera `nginx-app.conf` e `nginx-ssl-redirect.conf` reais em `deployment-guide/config/`. Hoje o conteúdo está hardcoded no DEPLOY.md.
3. **Atualizar `DEPLOY.md` para referenciar scripts** — Após (1), substituir blocos `bash` longos por "execute `01-setup-vps.sh`" + nota explicativa.

### Prioridade 2 — Cobertura e qualidade
4. **Snapshot test do DEPLOY.md** — Falta no `test/integration/guide.test.ts`. Padrão já existe no `guide-checklist.test.ts` (`normalizeOutput` + `toMatchSnapshot`).
5. **Atualizar `docs/registries.md`** — Documentar o `GuideRegistry`, padrões e extensão.
6. **Atualizar `CLAUDE.md`** — Adicionar `src/guide/` à tabela de módulos + na seção "Roadmap de fases" (Guide v1).

### Prioridade 3 — UX e diferenciação (Fase 2)
7. **TUI: tela `deploy-target`** — Após `Summary`, perguntar provedor + domínio + chamar `guideContext()`. Aproveita o modelo do checklist.
8. **TUI: tela `deploy-checklist`** — Renderizar `ChecklistSection[]` com navegação por seção e checkbox interativo. Estado persistido localmente em `~/.lovable-migrate/progress/<projectName>.json`.
9. **Perfis dedicados** — `targets/digitalocean.ts` e `targets/aws-lightsail.ts` (hoje caem em `generic`).

### Prioridade 4 — Release
10. **Estratégia de commit** — Sugestão: 2 commits separados para preservar histórico granular:
    - `feat(guide): add DEPLOY.md generator for assisted deploys`
    - `feat(guide): add CHECKLIST.md generator with operational checklist`
    - Ou 1 commit único: `feat(guide): Deploy Assistido v1 (DEPLOY.md + CHECKLIST.md)`.
11. **Bump para 0.4.0** quando scripts + nginx estiverem prontos — caracteriza release "Deploy Assistido v1 completo".

---

## 9. Riscos conhecidos

| Risco | Probabilidade | Impacto | Mitigação |
|---|---|---|---|
| **Scripts bash gerados (futuro) terem bugs em distros não-Ubuntu** | Média | Médio | Fixar target Ubuntu 22.04 LTS no MVP; warnings explícitos no DEPLOY.md |
| **Mudanças no painel Hostinger quebram instruções** | Baixa | Médio | Strings ficam isoladas em `targets/hostinger.ts`. Atualização = 1 arquivo |
| **Usuário rodar scripts fora de ordem** | Média | Alto (no futuro) | Quando implementar scripts, adicionar verificação de pré-condição no header de cada `.sh` |
| **Nginx conf não funciona para subdomínios / path-based routing** | Média | Médio | Hoje só suportamos domínio raiz + www. Documentar limitação. Future: detector + template alternativo |
| **Certbot falha por DNS não propagado** | Alta | Baixo (usuário) | Warning explícito no checklist (item `ssl.certbot-run`) + seção troubleshooting do DEPLOY |
| **Snapshots quebrarem em sistemas com locale diferente** | Baixa | Baixo | Strings PT-BR são hard-coded; sem dependência de locale |
| **`ChecklistItem` aliased pode confundir consumidores externos** | Baixa | Baixo | Aliases documentados em `src/index.ts` com comentário explicando o porquê |
| **Domínio com Unicode (IDN) não é tratado** | Muito baixa | Baixo | `normalizeDomain` apenas strip protocolo/slash. Adicionar idn-uts46 quando demanda surgir |

---

## 10. TODOs imediatos (ao retomar)

```
[ ] Decidir estratégia de commit (1 monolítico ou 2 commits)
[ ] git add src/guide/ src/cli.ts src/core/ src/index.ts src/output/ \
            test/helpers/pipeline.ts \
            test/integration/guide*.ts \
            test/snapshots/guide-checklist.snap
[ ] Considerar adicionar HANDOFF.md ao .gitignore OU mover para docs/handoffs/
[ ] Implementar tasks/script-generator.ts (próximo high-ROI)
[ ] Implementar tasks/nginx-generator.ts (depois do script-generator)
[ ] Adicionar snapshot test do DEPLOY.md (padrão existente no checklist test)
[ ] Atualizar docs/registries.md com seção do GuideRegistry
[ ] Atualizar CLAUDE.md (tabela de módulos + roadmap de fases)
[ ] [opcional] Bump 0.4.0-alpha se quiser publicar preview
```

---

## 11. Comandos úteis para retomar amanhã

### Setup e validação rápida
```powershell
# Verificar estado
git status -s
npm run typecheck
npm run typecheck:test
npm test                     # esperar: 432 passed em 30 files

# Testes só do módulo guide
npx vitest run test/integration/guide.test.ts test/integration/guide-checklist.test.ts
```

### Gerar pacote real para inspeção visual
```powershell
# DEPLOY.md + CHECKLIST.md (target Hostinger, com domínio)
npm run dev -- guide ./test/fixtures/supabase-project `
  --target hostinger `
  --domain meuapp.com `
  --output ./tmp-out

# Inspeção
code ./tmp-out/deployment-guide/DEPLOY.md
code ./tmp-out/deployment-guide/CHECKLIST.md

# Limpeza
Remove-Item -Recurse -Force ./tmp-out
```

### Comparar variações
```powershell
npm run dev -- guide ./test/fixtures/react-vite --target hostinger --output ./tmp1
npm run dev -- guide ./test/fixtures/react-vite --target generic   --output ./tmp2
npm run dev -- guide ./test/fixtures/react-vite --target hostinger --domain x.com --output ./tmp3
```

### Atualizar snapshot (se mudar layout do CHECKLIST)
```powershell
npm run test:snapshots
```

### Build e dry-run de publicação (não tocar — só validar)
```powershell
npm run build
npm pack --dry-run
```

### Continuar implementação (script generator)
```
Local: src/guide/tasks/script-generator.ts
Padrão a seguir:
  1. Função pura por script: build01SetupVps(ctx, config): GeneratedScript
  2. Renderização: renderBashScript(script): string
  3. Entry point: generateScripts(ctx, config): BashScriptsArtifact
  4. Registry: .register({ key: 'scripts', run: ({ ctx, config }) => generateScripts(ctx, config) })
  5. Adicionar campo `scripts: BashScriptsArtifact` em GuideState
  6. Atualizar collectAllFiles em src/guide/index.ts
```

### Wizards interativos (não inclui guide ainda)
```powershell
npm run dev -- ui            # wizard atual
npm run dev -- demo          # projeto demo embutido
```

---

## 12. Pontos de atenção para a próxima sessão

1. **Não comitar `.claude/settings.local.json`** — é configuração local. Verificar se já está no `.gitignore`.
2. **CRLF/LF warnings** — Git está convertendo automaticamente. Não é problema, mas se quiser limpar: `git add --renormalize .`.
3. **`HANDOFF.md` na raiz** — Decidir se vai para `.gitignore` ou se entra em `docs/handoffs/`. Sugestão: mover para `docs/handoffs/2026-05-16-guide-module.md` antes de commitar.
4. **Versão `0.3.5` no `package.json`** — Não foi bumpada nesta sessão. Bumpar para `0.4.0` deve esperar até scripts + nginx estarem prontos.
5. **Pipeline original intocado** — Comandos `analyze`, `migrate`, `deploy`, `remote`, etc., continuam idênticos. O `guide` é puramente aditivo.

---

## 13. Glossário rápido para retomada

- **GuideState** — Resultado da fase guide. Anexado ao `ProjectContext` via `withGuide()`.
- **GuideConfig** — Versão interna de `GuideOptions` com defaults aplicados. Tasks só consomem isso.
- **GuideTargetProfile** — Struct de strings PT-BR por provedor (Hostinger, generic, etc.).
- **ChecklistSection** — Agrupamento de itens por fase operacional (`pre-deploy`, `vps-setup`, etc.).
- **ChecklistItem** — Item individual com id estável, label, warning opcional, scriptRef opcional.
- **`__sectionBuilders`** — Export para testes (convenção interna). Não usar como API pública.
- **`normalizeOutput`** — Helper de testes que substitui timestamps/paths para snapshots estáveis.
- **`buildXSection(ctx, config)`** — Função pura que retorna um `ChecklistSection`. Cada fase tem a sua.
- **`buildStepN(ctx, config)`** — Função pura que retorna uma seção do DEPLOY.md em markdown.

---

_Fim do handoff. Retomada esperada: descomprimir contexto em < 5 minutos lendo este arquivo._

_Última atualização: 2026-05-16 (encerramento da sessão de implementação do módulo `guide`)._
