# Política de Segurança

## Versões suportadas

| Versão | Suportada |
|---|---|
| 0.1.x | ✅ |

## Reportando uma vulnerabilidade

**Não abra uma issue pública** para vulnerabilidades de segurança.

Para reportar uma vulnerabilidade, envie um e-mail com:

1. **Descrição** do problema e seu impacto potencial
2. **Passos para reproduzir** (de forma detalhada)
3. **Versão afetada** do `lovable-migrate`
4. **Ambiente** (OS, versão do Node.js)
5. **Sugestão de correção** (opcional, mas muito bem-vinda)

Você receberá uma resposta em até **48 horas** confirmando o recebimento. Após a análise, manteremos você informado sobre o progresso.

## Modelo de segurança

O `lovable-migrate` opera com os seguintes princípios de segurança:

### O que a engine faz

- **Leitura** do projeto fonte (somente leitura)
- **Geração** de artefatos em um diretório de saída separado (`--output`)
- **Execução local controlada** via sandbox de whitelist (fase runtime)
- **Planejamento** de deploy remoto sem SSH real (fase remote)

### O que a engine nunca faz

- Modificar o projeto original
- Escrever fora do `outputDir` (verificado por path resolution antes de qualquer escrita)
- Executar comandos fora da whitelist: `node`, `npm`, `npx`, `pnpm`, `yarn`, `bun`, `docker`
- Usar `shell: true` no spawn de processos (injeção via argumentos é impossível ao nível do SO)
- Abrir conexões de rede exceto pela API HTTP (quando `lovable-migrate server` é invocado)
- Fazer login em serviços externos automaticamente
- Transmitir código-fonte para servidores externos

### Superfície de ataque

| Componente | Superfície | Mitigação |
|---|---|---|
| CLI | Input do usuário | Validação via Commander + path resolution |
| API HTTP | Rede local (127.0.0.1 por padrão) | Rate limiting + schema validation + campo extra bloqueado |
| Runtime sandbox | Execução de processos | Whitelist + `shell: false` + null byte blocking |
| Writer | Filesystem | Path resolution — todo path validado contra `outputDir` |
| Remote | Nenhuma (modelagem pura) | Sem conexões reais |

### API HTTP em produção

O servidor HTTP (`lovable-migrate server`) por padrão escuta apenas em `127.0.0.1`. **Não exponha a API diretamente à internet** sem autenticação adicional — a API atual não implementa autenticação e destina-se a uso local/CI.

Se precisar expô-la em uma rede, use um proxy reverso (nginx, Caddy) com autenticação na frente.

## Histórico de vulnerabilidades conhecidas

Nenhuma vulnerabilidade conhecida até o momento.
