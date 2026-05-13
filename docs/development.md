# Guia de desenvolvimento

## Setup

```bash
git clone <repo>
cd lovable-migrate
npm install
npm run build
```

**Requisito:** Node.js >= 20.0.0

## Scripts disponíveis

| Script | Descrição |
|---|---|
| `npm run build` | Compila TypeScript → `dist/` |
| `npm run build:clean` | Remove `dist/` e recompila do zero |
| `npm run dev` | Executa CLI via ts-node (sem build) |
| `npm run typecheck` | Verifica tipos em `src/` sem emitir |
| `npm run typecheck:test` | Verifica tipos em `test/` (exclui fixtures) |
| `npm test` | Executa todos os testes (Vitest) |
| `npm run test:watch` | Modo watch interativo |
| `npm run test:snapshots` | Atualiza snapshots após mudança intencional |
| `npm run test:dist` | Testa artefatos da distribuição (requer `npm run build` antes) |
| `npm start` | Executa `dist/cli.js` diretamente |

## Executar o CLI em desenvolvimento

```bash
npm run dev -- inspect /path/to/project
npm run dev -- analyze /path/to/project --format json
npm run dev -- migrate /path/to/project --output ./output/teste
npm run dev -- server --port 3001
npm run dev -- ui
```

O `--` separa flags do npm das flags do CLI.

## Estrutura de diretórios

```
src/
├── core/          ← ProjectContext, withX helpers
├── sources/       ← LocalFolderSource, ZipSource, GitHubSource, ignore.ts
├── analyzer/      ← DetectorRegistry + 10 detectores
├── planner/       ← PlannerRegistry + 7 strategies
├── validator/     ← ValidationRegistry + 7 rules
├── migrator/      ← MigratorRegistry + 6 tasks + writer.ts
├── deploy/        ← DeployerRegistry + 2 tasks + writer.ts
├── executor/      ← ExecutorRegistry + 7 tasks
├── runtime/       ← RuntimeRegistry + 6 tasks + sandbox.ts + process.ts
├── remote/        ← RemoteRegistry + 7 tasks
├── output/        ← Renderer, TerminalRenderer, JsonRenderer
├── tui/           ← Ink/React TUI (screens, components, hooks, state)
├── server/        ← Fastify HTTP API
├── logger/        ← Logger com níveis e flag verbose
├── cli.ts         ← Entry point do CLI (Commander)
├── index.ts       ← Exportações públicas da engine
└── version.ts     ← Versão lida do package.json
test/
├── fixtures/      ← Projetos-exemplo estáticos (somente leitura)
├── helpers/       ← normalize.ts, pipeline.ts
├── integration/   ← Testes de pipeline e server
├── tui/           ← Testes de reducer e componentes
├── packaging/     ← Testes de integridade do pacote e CLI
└── snapshots/     ← Snapshots centralizados (gerenciados pelo Vitest)
```

## Adicionar um novo detector (analyzer)

1. Criar `src/analyzer/detectors/<nome>.ts`
2. Exportar função `detect<Nome>(files: ProjectFile[], ...): <Tipo>`
3. Registrar em `src/analyzer/index.ts`:

```typescript
registry.register({
  key: 'minhaChave',
  detect: ({ files, packageJson }) => detectMeuNome(files, packageJson),
});
```

4. Adicionar campo correspondente em `AnalysisReport` em `src/analyzer/types.ts`

**Regras:**
- Detectores não importam de outros detectores — dependências via `ctx.partial`
- `ProjectFile.relativePath` usa `/` sempre — nunca `path.sep`
- Assuma que `node_modules`, `dist`, `.git` etc. nunca aparecem em `files[]`

## Adicionar uma nova strategy (planner)

1. Criar `src/planner/strategies/<nome>.ts` implementando `Strategy<K>`
2. Registrar em `src/planner/index.ts` na posição correta (respeitando dependências de `partial`)
3. Adicionar campo em `MigrationPlan` em `src/planner/types.ts`

## Adicionar uma nova rule (validator)

1. Criar `src/validator/rules/<nome>.ts` retornando `ValidationIssue[]`
2. Registrar em `src/validator/index.ts`

**Regras:**
- Validator é somente leitura — nenhuma correção automática
- Rules não importam umas das outras — todas leem `ProjectContext` diretamente
- Severidade `critical` → `safeToMigrate = false`

## Adicionar uma nova task (migrator/deploy/executor)

O padrão é idêntico em todos os módulos síncronos:

1. Criar `src/<modulo>/tasks/<nome>.ts` — função pura, sem I/O
2. Retornar `GeneratedFile[]` com conteúdo e path relativo ao `outputDir`
3. Registrar em `src/<modulo>/index.ts`

**Migrator/Deploy:** toda escrita em disco passa por `writer.ts` — tasks são 100% puras.

## Adicionar uma nova task (runtime)

Runtime é assíncrono e executa processos reais:

1. Criar `src/runtime/tasks/<nome>.ts` com função `async`
2. Usar **sempre** `runSafeCommand` do `sandbox.ts` — nunca `runCommand` diretamente
3. Registrar em `src/runtime/index.ts`

```typescript
import { runSafeCommand } from '../sandbox';

export async function myTask(ctx: RuntimeTaskContext): Promise<MyResult> {
  const result = await runSafeCommand('npm', ['run', 'test'], {
    cwd: ctx.projectDir,
    timeout: 120_000,
  });
  return { exitCode: result.exitCode };
}
```

## Testes

### Estrutura de um teste de integração

```typescript
import { loadFixture, runAnalysis } from '../helpers/pipeline';

describe('meu teste', () => {
  it('analisa react-vite', async () => {
    const ctx = await loadFixture('react-vite');
    const result = await runAnalysis(ctx);
    expect(result.framework).toBe('react');
  });
});
```

### Snapshots

```bash
npm run test:snapshots   # atualiza após mudança intencional de output
```

Antes de snapshottar, sempre normalizar com `normalizeOutput()`:

```typescript
import { normalizeOutput } from '../helpers/normalize';
expect(normalizeOutput(content)).toMatchSnapshot();
```

### Fixtures

| Fixture | Framework | package.json | Env vars | Supabase |
|---|---|---|---|---|
| `react-vite` | react + vite | ✓ | VITE_API_URL, VITE_APP_TITLE | ✗ |
| `minimal-js` | unknown | ✓ | APP_GREETING | ✗ |
| `broken-project` | unknown | ✗ | — | ✗ |
| `supabase-project` | react + vite | ✓ | VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY | ✓ (1 migration, 1 edge fn) |

**Fixtures são somente leitura.** Para testes de runtime que precisam escrever no diretório do projeto, copiar o fixture para `os.tmpdir()` antes de usar:

```typescript
const tmpDir = await makeTempDir();
fs.cpSync(fixturePath, tmpDir, { recursive: true });
// usar tmpDir como projectDir
```

Para adicionar novo fixture: criar diretório em `test/fixtures/`, não adicionar a `.gitignore`.

### Normalização de snapshots

`normalizeOutput()` em `test/helpers/normalize.ts` remove antes de snapshottar:
- **Timestamps ISO** (`detectedAt`, `generatedAt`, etc.) → `<TIMESTAMP>`
- **Paths absolutos** do fixture dir → `<FIXTURE_DIR>`
- **Paths absolutos** do output dir → `<OUTPUT_DIR>`
- **Separadores Windows** (backslash → forward slash)

Isso garante snapshots **multiplataforma** e **determinísticos entre execuções**.

Conteúdo de arquivos gerados (Dockerfile, docker-compose.yml, .dockerignore) não contém timestamps nem paths — pode ser snapshot sem normalização.

## TypeScript

- Strict mode obrigatório — sem `any` exceto em casts controlados documentados
- Target: ES2020, module: commonjs
- `"jsx": "react"` — configurado em `tsconfig.json` para arquivos `.tsx` da TUI
- Verificar antes de PR: `npm run typecheck && npm run typecheck:test`

## Convenções

- Toda comunicação com o usuário em **português do Brasil**
- Código, variáveis, tipos e comentários técnicos em **inglês**
- Composição sobre herança — `implements Interface` em vez de `extends Classe`
- Sem `path.sep` em detectores — `ProjectFile.relativePath` usa `/` sempre
- Contexto imutável — sempre `{ ...ctx, novoCampo }`, nunca mutação direta

## CI

O CI executa automaticamente em push/PR:

```
npm run typecheck
npm run typecheck:test
npm test
npm run build
node dist/cli.js --version
node dist/cli.js --help
```

Ver `.github/workflows/ci.yml` para a configuração completa (Node matrix: 20, 22).

## Release

### Versão

Lida dinamicamente de `package.json` via `src/version.ts` — nunca hardcode versão no código:

```typescript
import pkg from '../package.json';
export const VERSION: string = pkg.version;
```

### Build pipeline pré-release

```bash
npm run typecheck          # 1. verificar tipos
npm run typecheck:test     # 2. verificar tipos dos testes
npm test                   # 3. rodar testes
npm run build              # 4. compilar para dist/
npm run test:dist          # 5. verificar integridade do pacote
```

`prepublishOnly` garante que steps 1-4 rodam automaticamente antes de `npm publish`.

### Pacote npm — o que é incluído

O campo `"files"` em `package.json` controla o conteúdo publicado:
- `dist/` — código compilado
- `README.md` — documentação principal
- `LICENSE` — licença MIT

`src/`, `test/`, `docs/`, `.github/` **não são incluídos**.

### CI/CD

| Workflow | Trigger | O que faz |
|---|---|---|
| `ci.yml` | push/PR em qualquer branch | typecheck, test, build, verify CLI — Node matrix [20, 22] |
| `release.yml` | push de tag `v*.*.*` | valida semver, `npm publish`, cria GitHub Release |

**Nunca fazer `npm publish` manual** — o release workflow cuida disso.

### Packaging tests

`test/packaging/` verifica a distribuição:
- `integrity.test.ts` — valida `package.json` fields e estrutura de `dist/`
- `cli.test.ts` — valida CLI binary, shebang, `--version`, `--help`

Esses testes usam `it.skipIf(!distExists())` — passam silenciosamente sem build, executam após `npm run build`.

### Criar um release

1. Atualizar versão em `package.json`
2. Atualizar `CHANGELOG.md`
3. Commit + `git tag vX.Y.Z`
4. `git push && git push --tags`
5. CI cria o GitHub Release e publica no npm automaticamente
