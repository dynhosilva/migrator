# GIF Storyboard — lovable-migrate demo

Storyboard detalhado para o GIF de demonstração de 20-30 segundos.
Ferramenta alvo: **Asciinema** + **agg** (converte `.cast` → `.gif`).

---

## Comando único

```bash
asciinema rec demo.cast --overwrite -c "lovable-migrate demo"
agg demo.cast demo.gif --theme monokai --font-size 16 --cols 80 --rows 40
```

---

## Sequência de frames

### Frame 1 — Prompt limpo (0.0s–1.0s)
```
❯ _
```
**Duração:** 1 segundo de pausa.  
**Objetivo:** dar tempo ao espectador de entrar no contexto antes de qualquer output.

---

### Frame 2 — Digitação do comando (1.0s–2.5s)
```
❯ npx lovable-migrate demo
```
**Objetivo:** mostrar que o comando é simples — uma linha, sem configuração.

---

### Frame 3 — Banner (2.5s–3.5s)
```
╔══════════════════════════════════════════════════════╗
║        lovable-migrate — Demo Interativo             ║
║   Projeto: react-supabase-dashboard  v0.2.0          ║
╚══════════════════════════════════════════════════════╝
```
**Objetivo:** primeiro sinal de que a ferramenta tem personalidade e cuidado com UX.  
**Pausa:** 1 segundo para o banner "pousar" antes de rolar.

---

### Frame 4 — Análise: stack principal (3.5s–7.0s)

```
  ┌──────────────────────────────────────────────────────┐
  │  Análise do Projeto                                  │
  └──────────────────────────────────────────────────────┘

  Framework      React 18 + Vite
  Build system   vite
  Package mgr    npm
  TypeScript     sim   (15 ts · 0 js)
  Tailwind CSS   sim
  Lovable        sim
  Scripts (4)    dev · build · preview · lint

  Deps (4)       react · react-dom · @supabase/supabase-js
                 tailwindcss
  Dev deps (4)   @vitejs/plugin-react · vite · typescript
                 @types/react
```

**Velocidade de reprodução:** 1x — este é o bloco principal de "wow".  
**Objetivo:** mostrar que a ferramenta sabe o que está olhando sem nenhum input do usuário.

---

### Frame 5 — Análise: Supabase (7.0s–10.0s)

```
  Supabase

  ✓ Auth · ✓ Storage · ✓ Realtime
  Migrations     2 arquivos SQL
  Edge Functions send-email · process-payment

  Rotas (5)      / · /auth · /dashboard
                 /settings · /profile

  Arquivos críticos
  src/App.tsx · src/lib/supabase.ts
  src/lib/storage.ts · src/lib/realtime.ts
```

**Velocidade de reprodução:** 1x — este é o "caramba, detectou tudo" moment.  
**Pausa:** 2 segundos após este bloco antes de cortar para os artefatos.

---

### Frame 6 — [corte] Plano e Validação (10.0s–11.5s)

Reproduzir em **2x** (ou cortar via `--speed 2.0` no agg).  
O espectador vê as seções "Plano de Migração" e "Validação" rolando rapidamente — sinal de que a ferramenta faz muito, mas sem exigir tempo de atenção para cada detalhe.

---

### Frame 7 — Artefatos gerados (11.5s–18.0s)

```
  ┌──────────────────────────────────────────────────────┐
  │  O que deploy geraria para este projeto              │
  └──────────────────────────────────────────────────────┘

  GitHub Actions
    ✓  ci.yml               pipeline de CI (lint → build → test)
    ✓  release.yml          deploy automático em push para main

  Docker
    ✓  Dockerfile           imagem Nginx otimizada para SPA
    ✓  docker-compose.yml   stack completa com variáveis de ambiente
    ✓  .dockerignore        exclui node_modules e artefatos de build

  Configuração
    ✓  .env.example         4 variáveis documentadas
    ✓  migration-guide.md   checklist de 15 passos para o Supabase

  Execução e planejamento
    ✓  deploy-instructions.md   guia completo de deploy
    ✓  execution-plan.json      plano legível por máquina
    ✓  remote-transfer-plan.md  script de transferência SSH
    ✓  remote-execution-plan.json
    ✓  analysis-report.json
```

**Velocidade:** 1x.  
**Objetivo:** a lista de 12+ artefatos é o momento de conversão — o usuário entende o que economiza.

---

### Frame 8 — CTA final (18.0s–22.0s)

```
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  ✓  Análise concluída. Projeto pronto para migração.

  Próximos passos:
    npx lovable-migrate migrate ./seu-projeto
    npx lovable-migrate deploy  ./seu-projeto

  Documentação: github.com/dynhosilva/migrator

❯ _
```

**Pausa:** 3 segundos antes do loop (se o GIF for infinito).

---

## Configurações de exportação (agg)

```bash
agg demo.cast demo.gif \
  --theme monokai \
  --font-size 16 \
  --cols 80 \
  --rows 42 \
  --speed 1.0         # velocidade base; frames 6-7 editados separadamente
```

Para controle fino de velocidade por segmento, edite `demo.cast` (formato JSON Lines) e ajuste os timestamps entre os frames do plano/validação.

---

## Variantes para plataformas

| Arquivo | Duração | Velocidade | Destino |
|---|---|---|---|
| `demo-full.gif` | ~25s | 1x geral, 2x no plano | README hero |
| `demo-analysis.gif` | ~8s | 1x | Twitter / LinkedIn |
| `demo-artifacts.gif` | ~6s | 1x | Product Hunt thumbnail |
| `demo-loop.gif` | ~15s | 1.5x geral | Discord / Slack preview |

---

## Checklist de qualidade antes de publicar

- [ ] Terminal exatamente em 80 colunas (`--cols 80`)
- [ ] Sem cursor piscando no frame final
- [ ] GIF abaixo de 5 MB (GitHub preview inline)
- [ ] Cores legíveis em fundo claro (alguns usuários tem tema claro no GitHub)
- [ ] Testar loop: o corte do final para o início não é abrupto
