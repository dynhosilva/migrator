# Primeiros passos

## Instalação

```bash
npm install -g lovable-migrate
```

**Requisito:** Node.js >= 18.0.0

Para verificar:
```bash
lovable-migrate --version
```

## Seu primeiro projeto

### 1. Exporte seu projeto do Lovable.dev

O Lovable.dev permite exportar o projeto como um repositório Git ou arquivo ZIP. Faça o download para uma pasta local.

### 2. Analise a stack

```bash
lovable-migrate analyze /path/to/projeto
```

Saída esperada:
```
Framework:        react
Build system:     vite
Package manager:  npm
Env vars:         VITE_API_URL, VITE_SUPABASE_URL
Supabase:         detectado (1 migration, 1 edge function)
```

### 3. Execute o pipeline completo

```bash
lovable-migrate deploy /path/to/projeto --output ./output/meu-projeto
```

Gera em `./output/meu-projeto/`:
- Arquivos de ambiente (`.env.example`)
- Dockerfile + docker-compose.yml
- Plano de execução (`dry-run.md`)
- Relatório (`migration-summary.json`)

### 4. Use a TUI interativa (opcional)

```bash
lovable-migrate ui
```

O wizard guia você por cada fase: análise → revisão → confirmação → geração de artefatos.

## Fontes de input aceitas

| Tipo | Exemplo |
|---|---|
| Pasta local | `/home/user/meu-projeto` |
| Arquivo ZIP | `/downloads/meu-projeto.zip` |
| Repositório Git (local) | `/repos/meu-projeto/.git` |

## Diretório de saída

Por padrão: `./output/<nome-do-projeto>/`

```bash
lovable-migrate migrate /path/to/projeto              # → ./output/meu-projeto/
lovable-migrate migrate /path/to/projeto -o ./custom  # → ./custom/
```

> O projeto original **nunca é modificado**. Todos os artefatos são gerados no diretório de saída.

## Próximos passos

- [Referência completa do CLI](cli.md)
- [Entender a arquitetura](architecture.md)
- [Configurar deploy remoto](remote.md)
