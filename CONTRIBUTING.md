# Contribuindo com o lovable-migrate

Obrigado pelo interesse em contribuir! Este guia cobre o processo de contribuição, convenções e como adicionar novas capacidades ao pipeline.

## Índice

- [Antes de começar](#antes-de-começar)
- [Setup do ambiente](#setup-do-ambiente)
- [Como contribuir](#como-contribuir)
- [Convenções](#convenções)
- [Adicionando novas capacidades](#adicionando-novas-capacidades)
- [Processo de review](#processo-de-review)

---

## Antes de começar

- Leia o [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md)
- Para bugs, abra uma [issue](https://github.com/dynhosilva/migrator/issues/new?template=bug_report.yml) antes de um PR
- Para features, abra uma [discussion](https://github.com/dynhosilva/migrator/discussions) para alinhamento antes de implementar
- Para vulnerabilidades de segurança, **não abra issue pública** — siga o [SECURITY.md](SECURITY.md)

---

## Setup do ambiente

```bash
git clone https://github.com/dynhosilva/migrator
cd lovable-migrate
npm install

# Verificar que tudo funciona
npm run typecheck
npm run typecheck:test
npm test
npm run build

# Testar o CLI compilado
node dist/cli.js --version
node dist/cli.js analyze ./examples/vite-react
```

**Requisitos:** Node.js >= 20.0.0, npm

---

## Como contribuir

### 1. Crie um branch

```bash
git checkout -b feat/minha-feature   # nova capacidade
git checkout -b fix/descricao-do-bug # correção de bug
git checkout -b docs/melhoria        # apenas documentação
```

### 2. Faça suas alterações

Antes de submeter, verifique:

```bash
npm run typecheck          # sem erros de tipo em src/
npm run typecheck:test     # sem erros de tipo em test/
npm test                   # todos os 233+ testes passando
npm run build              # compilação sem erros
```

### 3. Commits

Use mensagens claras e em inglês no imperativo:

```
feat: add vue 3 framework detector
fix: correct route detection in next.js projects
docs: add remote planning example
test: add edge cases for supabase detector
```

### 4. Abra um Pull Request

Use o template de PR fornecido. Inclua:
- O que foi alterado e por quê
- Como testar
- Referência a issues relacionadas

---

## Convenções

### Idiomas

- **Código, variáveis, funções, tipos:** inglês
- **Comunicação com o usuário (logs, relatórios, TUI):** português do Brasil
- **Comentários no código:** inglês (apenas quando o "porquê" não é óbvio)

### TypeScript

- Strict mode obrigatório — sem `any` exceto em casts controlados e documentados
- Composição sobre herança — `implements Interface` em vez de `extends Classe`
- Contexto imutável — sempre `{ ...ctx, novoCampo }`, nunca mutação direta

### Estrutura de módulos

Cada fase do pipeline segue o mesmo padrão:

```
src/<fase>/
├── types.ts        ← tipos específicos da fase
├── index.ts        ← função pública + registry
├── registry.ts     ← orquestrador do registry
└── <tasks|detectors|strategies|rules>/
    └── *.ts        ← implementações individuais (puras, sem I/O)
```

### O que NÃO fazer

- Não mutar `ProjectContext` — sempre criar novo via spread
- Não adicionar lógica de domínio na TUI, CLI ou API — pertencem à engine
- Não chamar `runCommand` diretamente no runtime — sempre via `runSafeCommand`
- Não adicionar executáveis à whitelist do runtime sem revisão explícita
- Não usar `path.sep` em detectores — `ProjectFile.relativePath` usa `/` sempre
- Não criar dependências circulares entre módulos

---

## Adicionando novas capacidades

### Novo detector (analyzer)

```bash
# 1. Criar o detector
touch src/analyzer/detectors/meu-detector.ts

# 2. Implementar
export function detectMeuTipo(files: ProjectFile[]): MeuTipo {
  // ...
}

# 3. Registrar em src/analyzer/index.ts
registry.register({
  key: 'meuTipo',
  detect: ({ files }) => detectMeuTipo(files),
});

# 4. Adicionar campo em src/analyzer/types.ts
# 5. Escrever testes em test/integration/analysis.test.ts
```

### Nova rule (validator)

```bash
touch src/validator/rules/minha-rule.ts
# Implementar: (ctx: ProjectContext) => ValidationIssue[]
# Registrar em src/validator/index.ts
```

### Nova task (migrator/deploy/executor)

Tasks são funções puras — sem I/O de disco. O writer faz a escrita.

```bash
touch src/migrator/tasks/minha-task.ts
# Implementar: (ctx: TaskContext) => GeneratedFile[]
# Registrar em src/migrator/index.ts
```

### Nova tela na TUI

```bash
touch src/tui/screens/MinhaTela.tsx
# 1. Criar o componente
# 2. Registrar em src/tui/app.tsx
# 3. Adicionar ao tipo Screen em src/tui/state/types.ts
```

### Nova fase completa do pipeline

Siga o padrão de 6 passos documentado em [CLAUDE.md](CLAUDE.md#como-implementar-uma-nova-fase-do-pipeline).

---

## Adicionando fixtures de teste

```bash
mkdir test/fixtures/meu-fixture
# Criar package.json mínimo + arquivos representativos
# NÃO incluir node_modules, dist ou arquivos pesados
```

Fixtures são somente leitura — nunca escreva em `test/fixtures/` a partir dos testes.

---

## Processo de review

- Todo PR requer aprovação de um maintainer
- Testes devem passar no CI (Node 20, 22)
- Snapshots devem ser atualizados se o output mudou intencionalmente (`npm run test:snapshots`)
- Documentação deve ser atualizada junto com a feature
- CLAUDE.md deve ser atualizado se regras arquiteturais mudaram

---

## Dúvidas?

Abra uma [discussion](https://github.com/dynhosilva/migrator/discussions) ou uma issue com a label `question`.
