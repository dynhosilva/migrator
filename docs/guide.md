# Módulo `guide` — referência técnica

Documento de referência para quem trabalha no código do módulo `src/guide/`. Para a visão de produto (o que é Deploy Assistido, por que existe), veja [`deploy-assisted.md`](deploy-assisted.md).

## O que esse módulo faz

O `guide` é a última fase do pipeline. Ele consome `ProjectContext` já enriquecido por `analyze` + `plan` + `deploy` e produz um **pacote humano de deploy assistido** no diretório de saída:

```
output/<projeto>/
└── deployment-guide/
    ├── DEPLOY.md         # guia narrativo passo a passo (PT-BR)
    ├── CHECKLIST.md      # checklist operacional verificável
    └── scripts/
        ├── 01-setup-vps.sh
        ├── 02-install-docker.sh
        ├── 03-upload-app.sh
        ├── 04-deploy-app.sh
        ├── 05-setup-ssl.sh
        └── 06-health-check.sh
```

O módulo **nunca executa nada** — apenas grava arquivos. A execução é sempre manual, pelo usuário, na máquina apropriada (local ou servidor).

## Onde encaixa no pipeline

```
analyze → plan → validate → migrate → deploy → execute → runtime → remote → cicd → guide
                                          │                                            │
                                          └── lê ctx.deploy.docker.exposedPort ────────┘
```

`guide` depende apenas de:
- `ctx.analysis` (obrigatório — `projectName`, framework, envVars, supabase)
- `ctx.plan` (obrigatório — `deployStrategy`, `env.required`)
- `ctx.deploy.docker.exposedPort` (opcional — usa fallback se ausente)

Não depende de `execute`, `runtime`, `remote` ou `cicd`. Pode rodar logo após `deploy`.

## Estrutura de arquivos

```
src/guide/
├── types.ts                          # tipos públicos do módulo
├── constants.ts                      # SCRIPTS_DIR, SCRIPT_FILENAMES, UNCONFIGURED, scriptRefFor
├── registry.ts                       # GuideRegistry (54 linhas, síncrono)
├── index.ts                          # orquestrador + resolveGuideConfig + validações
├── targets/
│   ├── index.ts                      # resolveTargetProfile + fallback genérico
│   ├── hostinger.ts                  # perfil hPanel + KVM
│   └── generic.ts                    # fallback neutro
└── tasks/
    ├── deploy-doc-generator.ts       # DEPLOY.md (15 seções)
    ├── checklist-generator.ts        # CHECKLIST.md (10 fases)
    └── script-generator.ts           # 6 scripts bash contextuais
```

## Mental model

```
GuideOptions  →  resolveGuideConfig  →  GuideConfig  →  GuideRegistry  →  GuideState
  (user)          (validação +              (tudo            (3 tasks         (resultado
                   defaults)                 preenchido)      independentes)    estruturado)
```

- **`GuideOptions`** — entrada do usuário (CLI/API/TUI). Todos os campos opcionais.
- **`GuideConfig`** — versão interna com defaults aplicados + validados. Tasks consomem isso, nunca `GuideOptions` cru.
- **`GuideState`** — saída completa anexada ao `ProjectContext` via `withGuide()`.

## GuideRegistry

Registry síncrono mínimo (54 linhas) que executa tasks em sequência acumulando `Partial<GuideState>`:

```typescript
const registry = new GuideRegistry()
  .register({ key: 'deployDoc', run: ({ ctx, config }) => generateDeployDoc(ctx, config) })
  .register({ key: 'checklist', run: ({ ctx, config }) => generateChecklist(ctx, config) })
  .register({ key: 'scripts',   run: ({ ctx, config }) => generateScripts(ctx, config) });
```

**Síncrono porque:** todas as tasks são puro template rendering — sem I/O além da escrita final em `writeGeneratedFiles` no orquestrador.

**Tasks são independentes:** nenhuma lê `partial.X!` de outra. Todas leem o mesmo `ctx + config`. A referência cruzada checklist→scripts (campo `scriptRef`) é feita via constantes estáticas em `constants.ts`, não pelo `partial`.

Padrão idêntico ao `RemoteRegistry` e `CicdRegistry`. Para o padrão genérico e outras fases, veja [`registries.md`](registries.md).

## GuideState

```typescript
interface GuideState {
  readonly projectName: string;
  readonly outputDir: string;
  readonly target: GuideTarget;
  readonly domain: string | null;
  readonly port: number;
  readonly remotePath: string;
  readonly deployDoc: DeployDocArtifact;
  readonly checklist: ChecklistArtifact;
  readonly scripts: BashScriptsArtifact;
  readonly difficultyLevel: 'beginner' | 'intermediate';
  readonly estimatedTotalMinutes: number;
  readonly generatedAt: string;
}
```

Cada artifact é estruturado (não só `string`), permitindo consumo programático por TUI/API:

```typescript
interface BashScriptsArtifact {
  readonly files: GeneratedFile[];              // para o writer
  readonly scripts: BashScriptFile[];           // lista ordenada (01..06)
  readonly scriptsByKey: Readonly<Record<BashScriptKey, BashScriptFile>>;
  readonly totalScripts: number;
  readonly estimatedMinutes: number;
  readonly chmodCommand: string;
  readonly scriptsDir: string;
}
```

## constants.ts

Constantes compartilhadas entre tasks irmãs. Existem aqui (e não em uma task específica) para que tasks possam referenciar valores estáveis sem criar dependência cruzada:

| Constante | Valor | Usado por |
|---|---|---|
| `UNCONFIGURED` | `'__NAO_CONFIGURADO__'` | sentinel injetado em scripts quando o usuário não passou domínio/email |
| `SCRIPTS_DIR` | `'deployment-guide/scripts'` | path comum a todos os geradores |
| `SCRIPT_FILENAMES` | `Record<BashScriptKey, string>` | filenames estáveis (`01-setup-vps.sh` etc.) |
| `scriptRefFor(key)` | `scripts/XX-name.sh` | usado em `ChecklistItem.scriptRef` para apontar do CHECKLIST para o script |

**Regra:** nada nesse arquivo deve depender de tasks. Apenas tipos do módulo podem ser importados (de `./types`). Se algo aqui crescer com lógica, mude para uma task dedicada.

## Tasks

### `deploy-doc-generator.ts` — DEPLOY.md

Narrativa completa em PT-BR. Montada por seções via funções puras `buildXSection(ctx, config) → string`:

| Seção | Função | Conteúdo |
|---|---|---|
| Header | `buildHeader` | título, tabela de metadados, callout "para quem é esse guia" |
| Overview | `buildOverview` | os 9 passos em alto nível + callout sobre atalhos |
| O que esperar | `buildExpectations` | tempo realista, o que vai mudar no servidor, erros comuns |
| Glossário | `buildGlossary` | termos técnicos (VPS, SSH, Docker, etc.) |
| Passos 1–9 | `buildStep1..9` | um por passo: prep VPS, SSH, Docker, upload, env, deploy, DNS, Nginx, SSL |
| Solução de problemas | `buildTroubleshooting` | 7 erros frequentes com solução exata |
| Atalhos via script | `buildScriptShortcuts` | tabela de scripts + `chmod +x` |
| Footer | `buildFooter` | contexto técnico (estratégia, confiança, timestamp) |

Ordem deliberada: **troubleshooting vem antes dos atalhos**. Iniciante que travou encontra a solução primeiro; quem domina chega em atalhos como recompensa.

### `checklist-generator.ts` — CHECKLIST.md

Modelo estruturado (não só markdown) — preparado para TUI interativa e API. 10 seções operacionais, cada uma com itens id-estáveis:

```typescript
interface ChecklistItem {
  readonly id: string;          // ex: 'docker.install' — estável entre regenerações
  readonly label: string;
  readonly required: boolean;
  readonly warning?: string;
  readonly scriptRef?: string;  // ex: 'scripts/02-install-docker.sh'
  readonly estimatedMinutes?: number;
  readonly difficulty?: 'easy' | 'medium' | 'hard';
}
```

Fases:
`pre-deploy` → `vps-setup` → `docker-install` → `upload` → `env` → `deploy` → `domain` → `ssl` → `post-deploy` → `troubleshooting`

`scriptRef` é preenchido para itens cobertos por um script, criando ligação navegável entre o CHECKLIST e o script correspondente.

### `script-generator.ts` — 6 scripts bash

Cada script é construído por uma função pura `buildXScript(ctx, config) → BashScriptFile`:

| Key | Filename | Onde roda | Função |
|---|---|---|---|
| `setup-vps` | `01-setup-vps.sh` | servidor | apt update + upgrade, timezone UTC, UFW liberando 22/80/443 |
| `install-docker` | `02-install-docker.sh` | servidor | Docker Engine via `get.docker.com` + compose plugin + systemctl enable |
| `upload` | `03-upload-app.sh` | **local** | tar+ssh streaming de `docker/` e `.env` (se existir) |
| `deploy` | `04-deploy-app.sh` | servidor | valida REQUIRED_VARS contra .env, `docker compose up -d --build`, logs |
| `ssl` | `05-setup-ssl.sh` | servidor | DNS pre-check, Nginx + Certbot, virtual host, renew dry-run |
| `health-check` | `06-health-check.sh` | servidor | diagnóstico Docker/app/Nginx/DNS/HTTPS — exit 0/1 |

Todos vêm com:
- `#!/usr/bin/env bash`
- `set -euo pipefail`
- Bloco de comentário documental no header (filename, propósito, onde executar, pré-requisitos, tempo, uso, versão, projeto, target)
- Variáveis injetadas do contexto (`config.port`, `config.domain`, `config.remotePath`)
- Cores ANSI para mensagens `[INFO]` / `[ OK ]` / `[WARN]` / `[FAIL]`

## Validação de inputs

`resolveGuideConfig` em `index.ts` normaliza e valida tudo antes do registry executar:

- **`normalizeDomain`** — remove protocolo/slash, rejeita `www.X`, valida formato `meuapp.com`.
- **`normalizeAdminEmail`** — regex pragmático, rejeita formato claramente errado.
- **Falha cedo, em PT-BR**, com instrução de correção.

Os tasks nunca recebem inputs malformados — chegam a `GuideConfig` apenas valores válidos ou `null`.

## Targets (providers)

Targets são **dados**, não código. Cada um é um struct `GuideTargetProfile`:

```typescript
interface GuideTargetProfile {
  readonly id: GuideTarget;                          // 'hostinger' | 'generic' | ...
  readonly displayName: string;                      // "Hostinger VPS"
  readonly panelName: string;                        // "hPanel"
  readonly defaultUser: string;                      // "root"
  readonly defaultRemotePath: string;                // "/opt/app"
  readonly defaultOs: string;                        // "Ubuntu 22.04 LTS"
  readonly recommendedPlan: string;                  // "KVM 2 (2 vCPU, 8 GB)"
  readonly panelInstructions: readonly string[];     // passos no painel
  readonly sshInstructions: readonly string[];       // como abrir SSH
  readonly notes: readonly string[];                 // observações específicas
}
```

`resolveTargetProfile(target)` retorna o perfil; targets sem perfil dedicado (digitalocean, aws-lightsail) caem em `GENERIC_PROFILE` automaticamente — fallback seguro, nunca bloqueia o usuário.

## Snapshots e testes

| Arquivo de teste | Cobertura | Testes |
|---|---|---|
| `test/integration/guide.test.ts` | targets, validação de inputs, DEPLOY.md | ~30 |
| `test/integration/guide-checklist.test.ts` | builders de seção, composição, snapshots | 32 |
| `test/integration/guide-scripts.test.ts` | builders, composição, contextualização, snapshots, `bash -n` syntax | 50+ |

Snapshots (`test/snapshots/guide*.snap`) são normalizados via `normalizeOutput()` — substituem timestamps, paths absolutos e versões para serem estáveis cross-platform.

**`bash -n` validation**: cada script gerado é gravado em arquivo temp e validado com `bash -n` (parse-only, não executa). Pega aspas mal fechadas, here-docs malformados, blocos `if/fi` desbalanceados. `describe.skipIf(!BASH_AVAILABLE)` para CI Windows sem bash.

## Extensibilidade

### Adicionar uma nova task ao registry

**3 ações mecânicas, zero alteração no orquestrador:**

1. Criar `src/guide/tasks/X-generator.ts` — função pura `(ctx, config) → Artifact`
2. Adicionar `readonly X: XArtifact` em `GuideState` (`src/guide/types.ts`)
3. Registrar em `index.ts`:
   ```typescript
   .register({ key: 'X', run: ({ ctx, config }) => generateX(ctx, config) })
   ```

Atualizar `collectAllFiles()` em `index.ts` para incluir os arquivos novos. Pronto.

Exemplo de tasks futuras candidatas: `nginx-generator.ts` (configs Nginx separadas), `troubleshooting-generator.ts` (catálogo expandido de erros), `update-generator.ts` (script `07-update-app.sh`).

### Adicionar um novo provider

**2 arquivos editados:**

1. Criar `src/guide/targets/<provider>.ts`:
   ```typescript
   export const DIGITALOCEAN_PROFILE: GuideTargetProfile = {
     id: 'digitalocean',
     displayName: 'DigitalOcean Droplet',
     panelName: 'DigitalOcean Console',
     defaultUser: 'root',
     defaultRemotePath: '/opt/app',
     defaultOs: 'Ubuntu 22.04 LTS',
     recommendedPlan: 'Basic 2GB ($12/mês)',
     panelInstructions: [...],
     sshInstructions: [...],
     notes: [...],
   } as const;
   ```

2. Registrar em `targets/index.ts`:
   ```typescript
   const PROFILES: Record<GuideTarget, GuideTargetProfile> = {
     hostinger:    HOSTINGER_PROFILE,
     digitalocean: DIGITALOCEAN_PROFILE,  // antes caía em GENERIC
     ...
   };
   ```

Todos os scripts já leem `config.profile.defaultUser` e `config.profile.defaultRemotePath` — funcionam automaticamente para o novo provider.

### Adicionar um novo script bash

Para adicionar `07-update-app.sh`:

1. Adicionar `'update'` em `BashScriptKey` (`types.ts`)
2. Adicionar entrada em `SCRIPT_FILENAMES` (`constants.ts`)
3. Criar `buildUpdateScript(ctx, config)` em `script-generator.ts`
4. Adicionar em `BUILDERS` e `SCRIPT_ORDER` no mesmo arquivo
5. Opcional: popular `scriptRef` em itens relevantes do checklist via `scriptRefFor('update')`

## Boundary público

Apenas o estritamente necessário é exposto em `src/index.ts`:

```typescript
export { guideProject, guideContext, resolveTargetProfile, listAvailableTargets } from './guide';
export type {
  GuideState, GuideOptions, GuideConfig,
  GuideTarget, GuideTargetProfile,
  DeployDocArtifact, ChecklistArtifact,
  BashScriptsArtifact, BashScriptFile, BashScriptKey, BashScriptExecutionLocation,
} from './guide';
```

**Não exposto deliberadamente** (são detalhe de implementação):
- `HOSTINGER_PROFILE`, `GENERIC_PROFILE` — acesse via `resolveTargetProfile(target)`
- `SCRIPT_FILENAMES`, `SCRIPTS_DIR`, `scriptRefFor` — constantes internas em `guide/constants.ts`
- `ChecklistSection`, `ChecklistItem`, `ChecklistPhase`, `ChecklistDifficulty` — exposto no submódulo `./guide` mas não em `src/index.ts`

## Segurança e limites

- **Nunca abre SSH.** O módulo não executa comandos remotos; apenas gera arquivos `.sh` para o usuário rodar manualmente.
- **Nunca modifica o projeto original.** Toda escrita vai para `outputDir`. O `writer.ts` valida via path resolution.
- **Nunca instala dependências.** Scripts gerados podem instalar coisas no servidor do usuário — mas só quando o usuário os executa.
- **`UNCONFIGURED` como gate de runtime.** Scripts que precisam de domínio/email exigem o argumento se não foi fornecido na geração — falham cedo com mensagem clara.
- **Validação de inputs cedo.** Domínio e email mal formados são rejeitados na geração, não no servidor.

## Anti-goals

O que o módulo `guide` **não pretende ser**:

- ❌ **Não é um agente SSH.** Não executa nada remotamente. Quando SSH automation existir (Fase 3), será um módulo separado (`src/remote/`) que **consome** `ctx.guide.scripts` — não substitui essa fase.
- ❌ **Não é um sistema de templates.** Não há mecanismo de override de templates pelo usuário. Customização é via `GuideOptions` + targets.
- ❌ **Não é multilíngue.** Hard-coded em PT-BR. i18n só quando houver demanda real validada.
- ❌ **Não é interativo.** A interatividade é responsabilidade da TUI (`src/tui/`), que vai consumir `GuideState` quando implementar a tela de deploy assistido.

## Referências

- **Visão de produto e fluxo do usuário:** [`deploy-assisted.md`](deploy-assisted.md)
- **Guia específico Hostinger:** [`hostinger.md`](hostinger.md)
- **Padrão de registries em outras fases:** [`registries.md`](registries.md)
- **Arquitetura geral:** [`architecture.md`](architecture.md)
- **CLI:** [`cli.md`](cli.md)
