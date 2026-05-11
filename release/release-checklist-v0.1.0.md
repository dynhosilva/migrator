# Release Checklist — v0.1.0

Checklist completo para o lançamento público do `lovable-migrate@0.1.0`.

---

## Código e qualidade

- [x] `npm run typecheck` — zero erros em `src/`
- [x] `npm run typecheck:test` — zero erros em `test/`
- [x] `npm test` — 233 testes passando (Vitest)
- [x] `npm run build` — compilação sem erros (ES2020/CommonJS)
- [x] `node dist/cli.js --version` — retorna `0.1.0`
- [x] `node dist/cli.js --help` — todos os 10 comandos listados
- [x] `npm install -g .` — instalação global funciona
- [x] `lovable-migrate analyze ./examples/vite-react` — análise funcionando
- [x] TypeScript strict mode — sem `any` não documentado

## Pacote npm

- [x] `npm pack --dry-run` — 607 arquivos, 170.2 kB comprimido
- [x] Campo `files` correto — inclui `dist/`, `README.md`, `LICENSE`
- [x] Campo `bin` correto — `lovable-migrate` → `dist/cli.js`
- [x] Campo `engines` — `node >= 18.0.0`
- [x] Campo `exports` — `"."` → `./dist/index.js`
- [x] Campo `license` — `MIT`
- [x] Campo `repository`, `homepage`, `bugs` preenchidos
- [x] `prepublishOnly` — typecheck + test + build automáticos
- [x] Versão em `package.json` e `src/version.ts` sincronizadas
- [ ] `NPM_TOKEN` configurado no GitHub Actions secrets
- [ ] `npm publish --dry-run` executado no CI com sucesso

## Documentação

- [x] `README.md` — hero, badges, quick start, pipeline, stacks, examples, roadmap
- [x] `docs/getting-started.md`
- [x] `docs/cli.md`
- [x] `docs/api.md`
- [x] `docs/tui.md`
- [x] `docs/runtime.md`
- [x] `docs/remote.md`
- [x] `docs/architecture.md`
- [x] `docs/architecture-overview.md`
- [x] `docs/development.md`
- [x] `docs/release-v0.1.0.md`
- [x] `docs/positioning.md`
- [x] `docs/onboarding-review.md`
- [x] `docs/launch-plan.md`
- [x] `CHANGELOG.md` — v0.1.0 documentado
- [x] `ROADMAP.md` — planejamento público
- [x] `CONTRIBUTING.md`
- [x] `CODE_OF_CONDUCT.md`
- [x] `SECURITY.md`
- [x] `LICENSE` — MIT

## GitHub

- [x] `.github/workflows/ci.yml` — Node matrix [18, 20, 22]
- [x] `.github/workflows/release.yml` — trigger em `v*.*.*`
- [x] `.github/ISSUE_TEMPLATE/bug_report.yml`
- [x] `.github/ISSUE_TEMPLATE/feature_request.yml`
- [x] `.github/ISSUE_TEMPLATE/config.yml`
- [x] `.github/PULL_REQUEST_TEMPLATE.md`
- [ ] CI passando em Node 18, 20 e 22 no GitHub
- [ ] Release workflow testado com tag dry-run
- [ ] Branch `main` protegido (require PR, require CI)
- [ ] Topics do repositório configurados
- [ ] Descrição do repositório atualizada
- [ ] Social preview configurada

## Exemplos

- [x] `examples/vite-react/` — React + Vite + TypeScript
- [x] `examples/next-supabase/` — Next.js + Supabase
- [x] `examples/minimal-static/` — HTML + JS puro
- [x] `examples/vue-vite/` — Vue 3 + Vite
- [x] `examples/node-api/` — Node.js + Express
- [x] `examples/strat-forge-pro/` — Projeto real Lovable.dev (README atualizado)
- [x] Todos os exemplos têm README documentando o que é detectado

## Assets e visual

- [x] `assets/diagrams/pipeline.mmd` — diagrama Mermaid do pipeline
- [x] `assets/diagrams/architecture.mmd` — diagrama de arquitetura
- [x] `assets/gifs/tui-demo.tape` — script VHS para demo animada
- [x] `assets/screenshots/` — mockups ASCII das telas principais
- [ ] GIF da TUI gerado (VHS ou asciinema)
- [ ] Screenshots reais capturadas e adicionadas ao README

## Segurança

- [x] `SECURITY.md` com modelo de ameaça e canal de reporte
- [x] Runtime sandbox documentado (whitelist + `shell: false`)
- [x] API HTTP não exposta publicamente por padrão
- [x] Nenhuma credencial hardcoded no código
- [x] Nenhum `console.log` com dados sensíveis

## Lançamento

- [ ] Tag `v0.1.0` criada e push para GitHub
- [ ] GitHub Release criado com changelog
- [ ] npm publicado com sucesso
- [ ] Post no X/Twitter
- [ ] Post no Reddit (r/node, r/selfhosted, r/lovable)
- [ ] Show HN no Hacker News
- [ ] Artigo no Dev.to
- [ ] GIF da TUI incluído no post de lançamento
