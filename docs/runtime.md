# Runtime — Execução local controlada

## Visão geral

O runtime é a única fase **assíncrona** e a única que executa processos reais. Ele roda `npm install`, `npm run build` e `docker build` no ambiente local do usuário — sempre de forma controlada via sandbox.

## Iniciar

```bash
# Via CLI — executa o pipeline completo incluindo runtime
lovable-migrate remote /path/to/projeto --output ./output/meu-projeto
```

O comando `remote` é o único que aciona o runtime. Os comandos `migrate`, `deploy` e `execute` geram artefatos apenas — não executam nada.

## Sandbox

### Whitelist de executáveis

Apenas estes executáveis são permitidos:

```
node  npm  npx  pnpm  yarn  bun  docker
```

Qualquer outro executável (ex: `rm`, `bash`, `sh`, `cmd`, `powershell`, `shutdown`) é **bloqueado** com `SandboxViolationError` antes de ser invocado.

### `shell: false` obrigatório

Todos os processos são lançados com `spawn(..., { shell: false })`. Isso significa:

- Metacaracteres de shell (`|`, `&&`, `;`, `$()`, etc.) **nunca são interpretados**
- Injeção de comandos via argumentos é impossível ao nível do SO
- O argumento vai diretamente ao processo filho, sem passar por interpretador

### Null byte blocking

Argumentos com `\0` (null byte) são bloqueados antes do spawn para prevenir escapes de validação em sistemas Unix.

## Diretórios

| Variável | Descrição |
|---|---|
| `projectDir` | Pasta do projeto fonte — onde `npm install` e `npm run build` rodam |
| `outputDir` | Pasta de artefatos gerados — onde o `Dockerfile` fica em `docker/` |

```
docker build --file <outputDir>/docker/Dockerfile <projectDir>
```

O `projectDir` tem como default `ctx.source.inputPath`. Em testes, sempre copiar o fixture para um temp dir antes de passar como `projectDir` — fixtures são somente leitura.

## O que é executado

| Task | Comando |
|---|---|
| `install` | `npm install` / `pnpm install` / `yarn install` / `bun install` (detectado) |
| `build` | `npm run build` (usa o script `build` do `package.json`) |
| `dockerBuild` | `docker build --file <outputDir>/docker/Dockerfile --tag <projeto>:local <projectDir>` |

### O que NÃO é executado

- `docker run` / `docker push`
- `npm start` ou qualquer servidor
- Comandos de deploy ou publicação
- SSH ou acesso remoto

## Timeout e captura de output

Cada comando tem um timeout configurável. Ao atingir o limite:
- O processo recebe `SIGTERM`
- `CommandResult.timedOut` é `true`
- stdout/stderr capturados até o momento são preservados

Stdout e stderr são capturados com limite de **4096 bytes** por stream. Saídas maiores são truncadas (o processo continua).

## Artefatos gerados

```
output/<project>/
└── runtime/
    ├── runtime-log.json     ← CommandResults estruturados (task, exitCode, durationMs, stdout, stderr)
    └── runtime-summary.md   ← Sumário legível com status de cada fase e próximos passos
```

### `runtime-log.json` — estrutura

```json
{
  "project": "meu-projeto",
  "tasks": [
    {
      "task": "install",
      "command": "npm install",
      "exitCode": 0,
      "durationMs": 4200,
      "timedOut": false,
      "stdout": "added 312 packages in 4s",
      "stderr": ""
    }
  ],
  "readiness": "success",
  "generatedAt": "2024-01-01T00:00:00.000Z"
}
```

### `RuntimeReadiness`

| Valor | Significado |
|---|---|
| `success` | Todos os comandos concluíram com sucesso |
| `partial` | Alguns comandos falharam mas outros tiveram sucesso |
| `failed` | Nenhum comando concluiu com sucesso |

## Fluxo interno

```
runProject(ctx, outputDir, projectDir?)
  → RuntimeRegistry.run(ctx, outputDir, projectDir)   ← async sequencial
      → install task   → CommandResult
      → build task     → CommandResult
      → dockerBuild    → CommandResult
      → artifacts      → ValidatedArtifacts
      → log task       → GeneratedFile[]
      → summary task   → GeneratedFile[]
  → collectAllFiles(partial)
  → writeGeneratedFiles(outputDir, files)
  → computeReadiness(partial)
```

## Adicionar nova task

1. Criar `src/runtime/tasks/<nome>.ts` implementando a interface `RuntimeTask`
2. Registrar em `src/runtime/index.ts` via `registry.register(...)`
3. Usar sempre `runSafeCommand` do `sandbox.ts` — nunca `runCommand` diretamente

```typescript
import { runSafeCommand } from '../sandbox';

export async function runMyTask(ctx: RuntimeTaskContext): Promise<MyTaskResult> {
  const result = await runSafeCommand('npm', ['run', 'lint'], {
    cwd: ctx.projectDir,
    timeout: 60_000,
  });
  return { exitCode: result.exitCode, ... };
}
```
