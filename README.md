# lovable-migrate

> **Move your Lovable.dev project to production — without losing your users.**

[![npm version](https://img.shields.io/npm/v/lovable-migrate.svg)](https://www.npmjs.com/package/lovable-migrate)
[![CI](https://github.com/dynhosilva/migrator/actions/workflows/ci.yml/badge.svg)](https://github.com/dynhosilva/migrator/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/node-%3E%3D20.0.0-brightgreen.svg)](https://nodejs.org/)

🇧🇷 [Versão em português](README.pt-BR.md)

---

## What is this?

You built something on [Lovable.dev](https://lovable.dev). Now you want to own your infrastructure — your own server, your own Supabase project, your own CI/CD pipeline.

The problem: **your users are tied to Lovable's Supabase project.** When you migrate, those `user_id` references break across every table.

`lovable-migrate` solves this in two ways:

1. **Generates production artifacts** — Dockerfile, docker-compose, GitHub Actions workflows, and deployment instructions — from your Lovable project. Zero manual configuration.
2. **Re-syncs your users** — matches users between your old and new Supabase projects by email, updates all `user_id` references in your tables, and creates a rollback backup automatically.

Your original project is **never modified**. Everything goes to `--output`.

---

## Quickstart — no install required

```bash
# Check your environment first
npx lovable-migrate@latest doctor

# Migrate users between Supabase projects (interactive wizard)
npx lovable-migrate@latest sync-ui

# Generate Docker + CI/CD artifacts for your project
npx lovable-migrate@latest deploy ./my-lovable-project
```

---

## Main use cases

### 1. Sync users after migration

When you create a new Supabase project, your users get new `auth.users` UUIDs. Every row in your database that references the old UUIDs breaks.

`sync-ui` reconnects them:

```bash
npx lovable-migrate@latest sync-ui
```

The wizard will guide you through:

1. **Choose your auth source** — service key (direct API) or a JSON export file from an Edge Function
2. **Enter your new Supabase project credentials**
3. **Preview** — see exactly which users will be remapped and how many rows will change
4. **Run** — updates all tables, creates a timestamped backup for rollback

**Using JSON export (recommended for most migrations):**

The safest way is to export your auth users from your old Supabase project via an Edge Function, then point `sync-ui` at the file — no OLD service key needed:

```
Old Supabase → Edge Function → auth-export.json
                                      ↓
                              npx lovable-migrate@latest sync-ui
                                      ↓
                              New Supabase (users re-linked)
```

After connecting, sync-ui shows a pre-flight preview:

```
  Usuários encontrados: 247
  Mapeamentos confirmados: 241  (97.6%)
  Suspeitos: 6
  Registros a atualizar: 1,842

  Confirmar? (S/n)
```

---

### 2. Generate production artifacts

Run the full deploy pipeline to get a Dockerfile, docker-compose, GitHub Actions workflows, and deployment instructions — all adapted to your exact stack:

```bash
lovable-migrate deploy ./my-lovable-project --output ./output/my-app
```

In seconds, you get:

```
output/my-app/
├── .github/workflows/
│   ├── ci.yml          # push + PR · Node [20, 22] · npm cache
│   └── release.yml     # tag v* · npm publish --dry-run
├── docker/
│   ├── Dockerfile      # multi-stage, optimized for your stack
│   ├── docker-compose.yml
│   └── .dockerignore
├── env/
│   └── .env.example    # all detected environment variables
├── deploy/
│   └── deploy-instructions.md
└── supabase/
    ├── migrations/     # SQL files ready to apply
    └── functions/      # Edge Functions ready for deploy
```

No manual configuration. The tool detects your framework, package manager, Supabase setup, env vars, and build system automatically.

---

## Requirements

**Node.js >= 20.0.0** is required. Run `doctor` to verify your environment:

```bash
npx lovable-migrate@latest doctor
```

```
  ✓  Node.js: 22.11.0
  ✓  npm: 10.9.0
  ·  Docker: não encontrado — necessário para: run, execute (deploy local) (opcional)
  ✓  lovable-migrate: 0.3.4

  Sistema: OK — pronto para usar lovable-migrate

  Comandos: analyze  plan  validate  migrate  deploy
            sync-users  sync-ui  server  ui  demo
```

`doctor` exits with code 1 if any required dependency is missing, so it's safe to use in CI scripts.

---

## Installation

```bash
# Use without installing (always latest version)
npx lovable-migrate@latest <command>

# Install globally
npm install -g lovable-migrate
lovable-migrate --version
```

**Requirements:** Node.js >= 20.0.0 · npm · Docker (optional, only for local container execution)

**Works on:** macOS · Linux · Windows 10/11 (PowerShell and WSL2)

---

## All commands

```
doctor        check your environment (Node, npm, Docker)
analyze       detect stack, framework, env vars, Supabase
plan          generate deploy strategy and risk list
validate      security gate — blocks unsafe migrations
migrate       generate artifacts (env, SQL, instructions)
deploy        generate Dockerfile + docker-compose
execute       verify environment + generate execution plan
remote        plan remote deployment
sync-users    re-sync user_ids between Supabase projects (CLI)
sync-ui       re-sync user_ids between Supabase projects (wizard)
ui            interactive migration wizard
server        start HTTP API server
demo          see the tool in action with a sample project
```

```bash
# Check environment
lovable-migrate doctor

# Analysis only — zero side effects
lovable-migrate analyze ./project [-v] [-f terminal|json]

# Generate all artifacts
lovable-migrate deploy ./project --output ./output/my-app

# Sync users (interactive wizard)
lovable-migrate sync-ui

# Sync users (CLI, non-interactive)
lovable-migrate sync-users \
  --old-url  https://xxx.supabase.co \
  --old-key  <service_role_key> \
  --new-url  https://yyy.supabase.co \
  --new-key  <service_role_key>

# Sync users from JSON export (no OLD service key needed)
lovable-migrate sync-users \
  --old-auth-export ./auth-export.json \
  --new-url  https://yyy.supabase.co \
  --new-key  <service_role_key>

# Dry-run (preview only, no changes)
lovable-migrate sync-users ... --dry-run

# Interactive wizard
lovable-migrate ui

# Start HTTP API
lovable-migrate server --port 3001

# Demo (no project needed)
lovable-migrate demo
```

---

## Supported stacks

| Framework | Build System | Deploy Strategy |
|---|---|---|
| React | Vite, CRA, Webpack | Static (nginx) |
| Vue 3 | Vite | Static (nginx) |
| Svelte / SvelteKit | Vite | Static (nginx) |
| Next.js | Next | Node Server |
| Node API | — | Docker (node) |
| Static HTML | — | Static (nginx) |

**Package managers:** npm · yarn · pnpm · bun

**Auto-detected:** Supabase (auth, storage, migrations, edge functions) · Tailwind · shadcn/ui

---

## Troubleshooting

### sync-ui: "Credenciais inválidas" or 401

- Verify the URL is in the format `https://xxxxx.supabase.co` (no trailing slash)
- The key must be the `service_role` key from **Project Settings → API** in your Supabase dashboard — not the `anon` key
- If your old project was deleted, use `--old-auth-export` with a JSON file instead

### sync-ui: No users mapped

- Check that emails in the old project match emails in the new project exactly (case-sensitive)
- Users created via OAuth providers (Google, GitHub) use the same email — they should match
- Run with `--dry-run` first to preview mappings before committing

### sync-ui: Some mappings marked as "suspicious"

Suspicious means the confidence scorer found something unexpected (e.g., accounts created far apart in time). Review those users in the HTML report before running without `--dry-run`. The HTML report is saved automatically after every run.

### Rollback after sync

Every real sync (non-dry-run) creates a timestamped JSON backup before writing anything:

```
sync-backup-2026-05-14T10-30-00.json
```

To rollback, run `sync-users` again with the backup file (see `sync-users --help`).

### Node.js version error

```
erro: lovable-migrate requer Node.js 20 ou superior.
  Versão atual: 18.x.x
  Atualize em: https://nodejs.org
```

Install Node.js 20+ from [nodejs.org](https://nodejs.org) or use a version manager:

```bash
# nvm (macOS/Linux)
nvm install 20 && nvm use 20

# fnm (Windows/macOS/Linux)
fnm install 20 && fnm use 20
```

### Docker not found

Docker is only required for `run` and `execute` commands (local container execution). `deploy`, `analyze`, `sync-ui`, and `doctor` work without Docker.

Install Docker Desktop from [docker.com](https://www.docker.com/products/docker-desktop/).

### Windows: permission errors

Run PowerShell as Administrator, or use WSL2:

```bash
wsl --install    # enable WSL2
# then run lovable-migrate inside WSL2
```

For `npx` on Windows, if you see `EACCES` errors, try:

```powershell
npm install -g lovable-migrate
lovable-migrate sync-ui
```

### RLS / Row Level Security errors after sync

After re-syncing user_ids, your RLS policies still reference the correct UUIDs — they just now point to the new project's users. If queries fail, check:

1. Your new Supabase project has RLS enabled with the same policies
2. The `anon` and `service_role` keys in your app's `.env` point to the **new** project
3. Edge Functions are deployed to the new project

---

## FAQ

**Do I need Docker to use this?**

No. Docker is only needed for `run` and `execute` (local container builds). `deploy`, `sync-ui`, `analyze`, and all other commands work without Docker.

**Will this modify my Lovable project?**

Never. `lovable-migrate` reads your project files and writes all artifacts to a separate output directory. Your original project is untouched.

**What happens if sync-ui fails halfway through?**

A backup is created before any writes. If the sync fails after some rows were updated, you can restore from the backup. The backup file path is shown in the final report.

**Can I run sync-ui multiple times?**

Yes. It's idempotent for the same source → destination pair. If a user is already mapped correctly, their rows won't be double-updated.

**I don't have the OLD Supabase service key — the project was deleted.**

Export your auth users from Lovable's Supabase project **before** deleting it, using an Edge Function. The export format is a simple JSON file that `sync-ui` accepts directly. See the [sync guide](docs/sync.md) for the Edge Function source.

If the project is already deleted, contact Lovable support — they may be able to provide an auth export.

**Does this work with self-hosted Supabase?**

Yes, as long as your `--old-url` / `--new-url` point to a valid Supabase-compatible API that supports `auth.admin`.

**Is the service_role key safe to use here?**

The `service_role` key is used only for listing and updating rows. It's never logged, stored, or sent anywhere except the Supabase API. The tool masks it in all output (shown as `***`). Use it over a secure network connection only.

**What's the difference between sync-users and sync-ui?**

`sync-users` is the CLI command — scriptable, non-interactive. `sync-ui` is the interactive terminal wizard with step-by-step guidance. Both use the same underlying engine.

---

## HTTP API

```bash
lovable-migrate server --port 3001
```

```bash
# Health check
curl http://localhost:3001/health

# Analyze a project
curl -X POST http://localhost:3001/analyze \
  -H "Content-Type: application/json" \
  -d '{"input": "/path/to/project"}'

# Full pipeline
curl -X POST http://localhost:3001/deploy \
  -H "Content-Type: application/json" \
  -d '{"input": "/path/to/project", "output": "./output/my-project"}'
```

**Available endpoints:** `/health` · `/version` · `/capabilities` · `/analyze` · `/plan` · `/validate` · `/migrate` · `/deploy` · `/execute` · `/remote`

Full documentation: [docs/api.md](docs/api.md)

---

## Architecture

```
ProjectContext (immutable — pipeline backbone)
     │
     ├── analyzeContext()   → AnalysisReport     (10 independent detectors)
     ├── planContext()      → MigrationPlan       (7 strategies)
     ├── validateContext()  → ValidationResult    (7 rules)
     ├── migrateContext()   → MigrationResult     [writes disk]
     ├── deployContext()    → DeployState          [writes disk]
     ├── cicdContext()      → CicdState            [writes disk]
     ├── executeContext()   → ExecutionState       [writes disk]
     ├── runContext()       → RuntimeState         [runs commands]
     └── prepareContext()   → RemoteState          [pure planning]

Transport layers (no domain logic):
     ├── CLI     — Commander
     ├── API     — Fastify (thin layer, rate-limited)
     └── TUI     — Ink/React (wizard)

Sync pipeline (separate from migration):
     └── src/sync/  → SyncPlan → SyncResult
           ├── auth-source.ts    (service-key | json-file | json-url)
           ├── email-matcher.ts  (email-based user mapping)
           ├── confidence-scorer.ts
           └── tui/              (sync-ui wizard)
```

Each phase receives `ProjectContext` and returns a **new** context via spread — immutability guaranteed throughout the pipeline.

Detailed documentation: [docs/architecture.md](docs/architecture.md)

---

## Philosophy

**The original project is never modified.**
All artifacts are generated in a separate output directory. `lovable-migrate` reads, analyzes, and writes only to `--output`.

**Dry-run by default.**
Before any real sync or execution, the pipeline generates a preview with exactly what would change. You review before confirming.

**Conservative by design.**
When data is insufficient for a safe decision, the planner uses `confidence: unknown` and surfaces risks explicitly. No silent assumptions.

**Execution sandbox.**
The runtime executes only a strict whitelist of executables (`node`, `npm`, `npx`, `pnpm`, `yarn`, `bun`, `docker`) with `shell: false` — argument injection is impossible at the OS level.

---

## Security

- No phase modifies the original project
- All disk writes validate that the path is inside `outputDir`
- Runtime uses a sandbox with executable whitelist and `shell: false`
- Service role keys are masked in all terminal output (shown as `***`)
- API validates schema and blocks extra fields by default
- Default rate limiting: 200 req/min per IP
- Remote planning doesn't open real SSH connections

To report vulnerabilities: [SECURITY.md](SECURITY.md)

---

## Examples

| Example | Stack | Demonstrates |
|---|---|---|
| [`strat-forge-pro`](examples/strat-forge-pro/) | React + Vite + Supabase + Bun | Real project exported from Lovable.dev |
| [`vite-react`](examples/vite-react/) | React + Vite + TypeScript | Most common case — static deploy |
| [`next-supabase`](examples/next-supabase/) | Next.js + Supabase | Node server deploy + database |
| [`minimal-static`](examples/minimal-static/) | HTML + JS | Minimal project without framework |
| [`vue-vite`](examples/vue-vite/) | Vue 3 + Vite | Alternative stack |
| [`node-api`](examples/node-api/) | Node.js + Express | Backend without frontend |

---

## Contributing

Contributions are welcome! See [CONTRIBUTING.md](CONTRIBUTING.md).

```bash
git clone https://github.com/dynhosilva/migrator
cd lovable-migrate
npm install
npm run dev -- demo           # see the demo running
npm run dev -- doctor         # check environment
npm run dev -- analyze ./examples/vite-react
npm test
```

---

## Documentation

| Document | Description |
|---|---|
| [Getting started](docs/getting-started.md) | Installation and first project |
| [CLI reference](docs/cli.md) | All commands and flags |
| [Sync guide](docs/sync.md) | sync-ui and sync-users — full walkthrough |
| [HTTP API](docs/api.md) | Endpoints and response envelopes |
| [TUI](docs/tui.md) | Interactive wizard — navigation and shortcuts |
| [Architecture](docs/architecture.md) | Pipeline, modules, and design decisions |
| [Runtime](docs/runtime.md) | Safe execution — sandbox and whitelist |
| [GitHub Actions](docs/cicd.md) | Workflow generation — architecture and philosophy |
| [Development](docs/development.md) | Setup, tests, and how to add phases |

---

## Roadmap

| Status | Item |
|---|---|
| ✅ | Analyze — stack, framework, Supabase detection |
| ✅ | Plan — deploy strategy and migration plan |
| ✅ | Validate — security gate with explicit blocking |
| ✅ | Migrate — filesystem artifact generation |
| ✅ | Deploy — multi-stage Dockerfile + docker-compose |
| ✅ | Execute — environment check + execution plan |
| ✅ | Runtime — controlled local build with sandbox |
| ✅ | Remote — remote deployment planning |
| ✅ | HTTP API — Fastify with rate limiting |
| ✅ | TUI — interactive migration wizard |
| ✅ | GitHub Actions — deterministic ci.yml + release.yml |
| ✅ | sync-ui / sync-users — re-sync user_ids between Supabase projects |
| ✅ | JSON auth export — migrate without OLD service key |
| ✅ | doctor — environment check command |
| 🔲 | Hostinger integration — automatic VPS deployment |
| 🔲 | Supabase CLI integration — automatic migration execution |

Full roadmap: [ROADMAP.md](ROADMAP.md)

---

## License

[MIT](LICENSE) — © 2026 lovable-migrate contributors
