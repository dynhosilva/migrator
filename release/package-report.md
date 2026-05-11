# Package Report — lovable-migrate@0.1.0

Gerado em: 2026-05-11  
Comando: `npm pack --dry-run`

---

## Resumo do pacote

| Item | Valor |
|---|---|
| Nome | `lovable-migrate` |
| Versão | `0.1.0` |
| Arquivo | `lovable-migrate-0.1.0.tgz` |
| Tamanho comprimido | **170.2 kB** |
| Tamanho descomprimido | **786.9 kB** |
| Total de arquivos | **607** |
| Shasum | `97ed4f2c96cc9fe49c4cbc37cff61a9ac7226231` |

---

## Arquivos raiz incluídos

| Arquivo | Tamanho | Motivo |
|---|---|---|
| `LICENSE` | 1.1 kB | Campo `files` |
| `README.md` | 10.3 kB | Campo `files` |
| `package.json` | 1.8 kB | Sempre incluído pelo npm |

## Conteúdo de `dist/`

O restante dos 607 arquivos são o código compilado em `dist/`:

| Módulo | Arquivos (aprox.) |
|---|---|
| `dist/analyzer/` | ~80 arquivos (detectors + registry + types) |
| `dist/planner/` | ~50 arquivos (strategies + registry + types) |
| `dist/validator/` | ~40 arquivos (rules + registry + types) |
| `dist/migrator/` | ~50 arquivos (tasks + writer + registry + types) |
| `dist/deploy/` | ~30 arquivos (tasks + registry + types) |
| `dist/executor/` | ~50 arquivos (tasks + registry + types) |
| `dist/runtime/` | ~50 arquivos (tasks + sandbox + process + types) |
| `dist/remote/` | ~60 arquivos (tasks + registry + types) |
| `dist/server/` | ~40 arquivos (routes + serializers + app + types) |
| `dist/tui/` | ~70 arquivos (screens + components + hooks + state) |
| `dist/core/` | ~10 arquivos |
| `dist/sources/` | ~20 arquivos |
| `dist/output/` | ~15 arquivos |
| `dist/logger/` | ~8 arquivos |
| `dist/cli.js` | entry point do CLI |
| `dist/index.js` | entry point da API pública |
| `dist/version.js` | versão dinâmica |

Cada arquivo `.js` tem seu correspondente `.d.ts` (tipos) e `.js.map` (source map) — por isso o número de arquivos é alto. Para reduzir em versões futuras: avaliar `declaration: false` para produção ou bundling com esbuild/rollup.

---

## O que NÃO está incluído

| Excluído | Motivo |
|---|---|
| `src/` | Não está em `files` |
| `test/` | Não está em `files` |
| `docs/` | Não está em `files` |
| `examples/` | Não está em `files` |
| `demos/` | Não está em `files` |
| `assets/` | Não está em `files` |
| `.github/` | Não está em `files` |
| `node_modules/` | Sempre excluído |
| `dist/**/*.map` | Incluído (útil para debugging) |
| `CLAUDE.md` | Não está em `files` |
| `CONTRIBUTING.md` | Não está em `files` |
| `CHANGELOG.md` | Não está em `files` |

---

## Verificação de instalação global

```bash
npm install -g lovable-migrate-0.1.0.tgz

lovable-migrate --version
# → 0.1.0  ✓

lovable-migrate analyze ./examples/vite-react
# → relatório de análise correto  ✓

lovable-migrate --help
# → todos os 10 comandos listados  ✓
```

**Resultado:** instalação global funcionando corretamente em Windows 11 + Node.js 20.

---

## Avaliação do tamanho

**170.2 kB comprimido** é adequado para uma engine de migração com:
- 8 fases de pipeline
- 10 comandos CLI
- API HTTP (Fastify)
- TUI interativa (Ink/React)
- Sandbox de runtime

**Comparação de referência:**
- `create-react-app`: ~6 MB
- `@nestjs/cli`: ~2.1 MB
- `vite`: ~3.5 MB
- `lovable-migrate`: **170 kB** ✓

---

## Recomendações para v0.2.0

- Avaliar remover `.js.map` do pacote publicado (reduz ~40% do tamanho descomprimido)
- Avaliar bundling com esbuild para reduzir de 607 para ~20 arquivos
- Adicionar `CHANGELOG.md` e `CONTRIBUTING.md` ao campo `files` para visibilidade no npm registry
