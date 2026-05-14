# TEST_PLAN.md — lovable-migrate sync-users

> Versão: 0.3.3 | Data: 2026-05-14 | Módulo: `src/sync/`
>
> Este documento cobre validação E2E real, smoke tests, stress tests, rollback,
> corrupção, edge cases, segurança e critérios de aprovação para produção.

---

## 1. Ambiente de referência

### 1.1 Pré-requisitos para E2E real

```
Supabase OLD project  (projeto Lovable original)
  URL:           https://<OLD_ID>.supabase.co
  service_role:  eyJhbGci... (role: service_role)
  Dados:         usuários reais + tabelas com user_id
  Estado:        congelado (sem novos logins durante o teste)

Supabase NEW project  (projeto novo após migração)
  URL:           https://<NEW_ID>.supabase.co
  service_role:  eyJhbGci... (role: service_role)
  Dados:         usuários re-cadastrados via Auth UI
  Estado:        schema idêntico ao OLD, dados de app zerados

Máquina de teste:
  OS:            Windows 11 / macOS / Ubuntu 22.04
  Node:          >= 18.x
  CLI instalada: npm install -g lovable-migrate (v0.3.3)
  Rede:          banda >= 10 Mbps, latência para supabase.co < 150 ms
```

### 1.2 Variáveis de ambiente para testes locais

```bash
SYNC_OLD_URL=https://<OLD_ID>.supabase.co
SYNC_OLD_KEY=eyJhbGci...   # service_role do projeto OLD
SYNC_NEW_URL=https://<NEW_ID>.supabase.co
SYNC_NEW_KEY=eyJhbGci...   # service_role do projeto NEW
SYNC_BACKUP_DIR=/tmp/sync-backups
```

---

## 2. Smoke Tests — "Funciona alguma coisa?"

Executar antes de qualquer coisa. Se algum falhar, parar.

### ST-01 — CLI carrega sem crash

```bash
lovable-migrate sync-users --help
```
**Esperado:** Menu de ajuda impresso, exit 0.
**Falha:** Qualquer erro de importação / TypeError / exit 1.

### ST-02 — Validação de config detecta anon key

```bash
lovable-migrate sync-users \
  --old-url https://abc.supabase.co \
  --old-key eyJhbGciOiJIUzI1NiJ9.eyJyb2xlIjoiYW5vbiJ9.AAAA \
  --new-url https://xyz.supabase.co \
  --new-key eyJhbGciOiJIUzI1NiJ9.eyJyb2xlIjoic2VydmljZV9yb2xlIn0.AAAA
```
**Esperado:** Erro "chave anon detectada para projeto ANTIGO", exit 1, zero chamadas de rede.
**Falha:** Processo tenta conectar ao Supabase ou exibe mensagem genérica.

### ST-03 — Dry-run não altera dados

```bash
lovable-migrate sync-users \
  --old-url $SYNC_OLD_URL --old-key $SYNC_OLD_KEY \
  --new-url $SYNC_NEW_URL --new-key $SYNC_NEW_KEY \
  --dry-run
```
**Esperado:** Relatório de plan impresso, exit 0, zero arquivos de backup criados,
zero updates no banco.
**Verificação pós-execução:**
```sql
-- No projeto NEW: verificar que nenhum user_id foi alterado
SELECT DISTINCT user_id FROM transactions ORDER BY user_id LIMIT 10;
-- Deve ser idêntico ao snapshot pré-execução
```
**Falha:** Arquivo de backup criado em dry-run, ou qualquer UPDATE executado.

### ST-04 — TUI inicializa sem crash

```bash
lovable-migrate sync-ui
```
**Esperado:** Tela de boas-vindas renderizada, processo espera input, Ctrl+C encerra limpo.
**Falha:** Erro de renderização Ink, TypeError, tela em branco.

### ST-05 — Typecheck e testes passam

```bash
npm run typecheck && npm run typecheck:test && npm test
```
**Esperado:** 0 erros TS, 336+ testes passando.
**Falha:** Qualquer erro TypeScript ou falha de teste.

---

## 3. E2E Tests — Fluxo completo

### E2E-01 — Migração básica (1 usuário, 1 tabela)

**Setup:**
```sql
-- No OLD: 1 usuário via auth.users
-- Na tabela 'notes': 3 registros com user_id = <old_uuid>
```

**Execução:**
```bash
lovable-migrate sync-users \
  --old-url $SYNC_OLD_URL --old-key $SYNC_OLD_KEY \
  --new-url $SYNC_NEW_URL --new-key $SYNC_NEW_KEY \
  --backup-dir $SYNC_BACKUP_DIR
```

**Resultados esperados:**
- Arquivo `sync-backup-<timestamp>.json` criado em `$SYNC_BACKUP_DIR`
- Arquivo `sync-<timestamp>.html` criado em `$SYNC_BACKUP_DIR`
- Saída: "1 usuário migrado, 3 linhas atualizadas"
- Exit 0

**Verificação pós-execução:**
```sql
-- No NEW: todas as 3 notes devem ter o new_uuid
SELECT COUNT(*) FROM notes WHERE user_id = '<new_uuid>';
-- Esperado: 3

SELECT COUNT(*) FROM notes WHERE user_id = '<old_uuid>';
-- Esperado: 0 (old_uuid não existe mais)
```

**Métricas a registrar:**
- Tempo total de execução
- Número de API calls ao Supabase (via logs verbose)
- Tamanho do arquivo de backup

**Critério de aprovação:** Dados completamente migrados, nenhuma linha com old_uuid restante.

---

### E2E-02 — Migração com múltiplas tabelas

**Setup:**
```sql
-- 2 usuários no OLD, tabelas: orders, profiles, transactions, subscriptions
-- Cada usuário tem registros em todas as 4 tabelas
```

**Execução:**
```bash
lovable-migrate sync-users ... --verbose
```

**Verificação:**
```sql
-- Nenhum old_uuid restante em nenhuma tabela
SELECT COUNT(*) FROM orders WHERE user_id IN ('<old_1>', '<old_2>');          -- 0
SELECT COUNT(*) FROM profiles WHERE user_id IN ('<old_1>', '<old_2>');        -- 0
SELECT COUNT(*) FROM transactions WHERE user_id IN ('<old_1>', '<old_2>');    -- 0
SELECT COUNT(*) FROM subscriptions WHERE user_id IN ('<old_1>', '<old_2>');   -- 0
```

**Critério de aprovação:** Zero registros órfãos.

---

### E2E-03 — Detecção de conflito bloqueia execução

**Setup:**
```sql
-- Usuário alice@test.com existe em OLD e NEW
-- No NEW: alice já tem 3 registros em 'orders' (criados após re-cadastro)
```

**Execução:**
```bash
lovable-migrate sync-users ... --dry-run
```

**Esperado:**
- Plan contém `conflicts: [{ email: "alice@test.com", tableName: "orders", existingRowCount: 3 }]`
- Saída exibe aviso de conflito
- Dados NÃO alterados

**Execução sem dry-run:**
```bash
lovable-migrate sync-users ...
```

**Esperado:**
- Aviso de conflito exibido
- Processo pede confirmação explícita antes de prosseguir (ou aborta com instruções)
- Saída clara sobre o risco de mesclagem de dados

**Critério de aprovação:** Usuário leigo entende o risco sem ler documentação.

---

### E2E-04 — Rollback completo

**Setup:**
- Executar E2E-01 com sucesso
- Anotar o arquivo de backup gerado

**Execução:**
```bash
lovable-migrate sync-users ... --rollback --backup-file $SYNC_BACKUP_DIR/sync-backup-<ts>.json
```

**Verificação pós-rollback:**
```sql
-- No NEW: all notes voltam a ter old_uuid
SELECT COUNT(*) FROM notes WHERE user_id = '<old_uuid>';  -- 3
SELECT COUNT(*) FROM notes WHERE user_id = '<new_uuid>';  -- 0
```

**Critério de aprovação:** Estado do banco idêntico ao snapshot pré-migração.

---

### E2E-05 — Sync-UI fluxo completo

1. `lovable-migrate sync-ui`
2. Tela Welcome → pressionar `Enter`
3. Tela Connect → preencher OLD URL, OLD KEY, NEW URL, NEW KEY
4. Tela Discover → aguardar discovery
5. Tela Preview → verificar usuários listados com confidence scores
6. Tela Confirm → confirmar
7. Tela Progress → acompanhar logs ao vivo
8. Tela Report → ler resultado final

**Verificações em cada tela:**
- Connect: Tab navega entre campos (4 campos)
- Discover: spinner visível durante chamadas de rede
- Preview: badges de confidence (high/medium/suspicious) exibidos corretamente
- Confirm: suspicious matches listados separadamente com aviso
- Progress: log ao vivo aparece em tempo real (cada UPDATE logado)
- Report: contagens de rows updated corretas, link para HTML report

**Critério de aprovação:** Fluxo completo sem crashes, dados corretos no relatório final.

---

## 4. Rollback Tests

### RB-01 — Rollback imediatamente após migração

Sequência:
1. Executar migração completa (E2E-01)
2. Verificar dados migrados corretamente
3. Executar rollback com backup gerado
4. Verificar restauração completa

**Sinal de falha:** Algum registro com new_uuid restante após rollback.

### RB-02 — Rollback com arquivo de backup corrompido

```bash
# Corromper o arquivo de backup
echo "CORRUPTED" > $SYNC_BACKUP_DIR/sync-backup-<ts>.json

lovable-migrate sync-users ... --rollback --backup-file $SYNC_BACKUP_DIR/sync-backup-<ts>.json
```
**Esperado:** Erro claro "arquivo de backup inválido ou corrompido", exit 1, zero updates.
**Falha:** Crash com stack trace, ou updates parciais executados.

### RB-03 — Rollback de backup parcial (cenário hipotético)

```bash
# Backup contém apenas parte das entradas (simular interrupção)
# Criar backup manual com apenas 2 das 10 entradas originais
```
**Esperado:** Rollback processa as 2 entradas, reporta "2 de 10 possíveis restaurados".
**Falha:** Assumir que restaurou tudo quando na verdade restaurou parcialmente.

### RB-04 — Rollback com permissão negada em uma tabela

Usar um client com permissão limitada que falha em `locked_table`:
**Esperado:**
- Resultado: `{ restored: N, errors: ["locked_table: Permission denied"] }`
- Tabelas sem lock foram restauradas normalmente
- Saída indica quais tabelas falharam no rollback

---

## 5. Interruption Tests

### IT-01 — Ctrl+C durante discovery

1. Iniciar `sync-users` (ou `sync-ui`)
2. Pressionar Ctrl+C durante a fase de contagem de linhas

**Esperado:**
- Processo termina limpo (exit 130 ou 1)
- Nenhum arquivo de backup criado (discovery não completou)
- Nenhum update executado
- Banco inalterado

**Falha:** Arquivo de backup criado mas vazio, ou processo fica preso.

### IT-02 — Ctrl+C durante execução

1. Iniciar `sync-users` com 100+ usuários
2. Pressionar Ctrl+C após 10-20% dos updates

**Esperado:**
- Processo termina
- Arquivo de backup está completo (foi criado antes da execução)
- Saída indica "migração interrompida — use --rollback --backup-file <X> para reverter"
- Banco em estado parcialmente migrado (previsível, documentado)

**Falha:** Banco em estado desconhecido, ou usuário não sabe como reverter.

### IT-03 — Perda de rede durante execução

Simular:
```bash
# Em outra janela, após 5 segundos de execução:
# Windows: netsh interface set interface "Wi-Fi" disabled
# Linux/Mac: sudo ifconfig en0 down
```

**Esperado:**
- Erros de rede capturados por update (não crash global)
- Updates subsequentes tentam continuar (ou param após N erros consecutivos)
- Resultado final indica quais updates falharam
- Backup ainda existe para rollback

**Falha:** Crash sem mensagem de erro, ou updates executados parcialmente sem registro.

### IT-04 — Reinício do processo após interrupção

Após IT-02, executar a mesma migração novamente sem rollback:
**Esperado:** Behavior documentado — ou a migração é idempotente (updates já feitos são no-op)
ou ela avisa "dados já parecem migrados" via conflict detection.

---

## 6. Stress Tests

### SS-01 — 100 usuários, 10 tabelas

**Setup:**
- 100 usuários no OLD, 80 no NEW (20 sem match)
- 10 tabelas com user_id, cada uma com ~50 registros por usuário

**Métricas esperadas:**
- Total de updates: 80 × 10 = 800 API calls
- Tempo estimado: < 5 minutos (com rede normal)
- Memória pico: < 100 MB
- Arquivo de backup: < 1 MB

**Critério de aprovação:** Conclusão sem timeout, sem OOM, resultados corretos.

### SS-02 — 1.000 usuários, 5 tabelas (scale test)

**Métricas esperadas:**
- Total de updates: 1000 × 5 = 5.000 API calls
- Tempo estimado: < 30 minutos
- Memória pico: < 500 MB
- Arquivo de backup: < 5 MB

**Monitorar:**
- Uso de memória do processo Node.js ao longo da execução
- Taxa de erros de rede (percentual de updates que falharam)
- Tempo por batch

**Critério de aprovação:** < 1% de falhas, conclusão dentro de 30 minutos.

### SS-03 — Tabelas com 1 milhão de registros

**Objetivo:** Verificar que o count query (estimatedRows) não trava.

**Esperado:**
- `select('*', { count: 'exact', head: true })` retorna em < 30 segundos
- Se > 30 segundos, timeout deve capturar e usar `estimatedRows: -1`
- Usuário informado: "contagem indisponível para tabela X (timeout), prosseguindo assim mesmo"

**Falha:** Hang indefinido durante discovery.

### SS-04 — OpenAPI spec muito grande (> 100 tabelas)

**Objetivo:** `findUserIdColumns` processa spec grande sem crash.

**Esperado:**
- Parsing < 5 segundos
- Colunas relevantes identificadas corretamente
- Extra columns da opção `--extra-columns` respeitadas

---

## 7. Corruption Tests

### CT-01 — Old UUID não existe mais no NEW auth.users

**Setup:** `makeMapping('old-uuid-que-sumiu', 'new-uuid-valido')` — old user foi deletado.

**Esperado:** Update executa (WHERE user_id = 'old-uuid-que-sumiu'), retorna 0 rows affected.
Relatório indica "0 linhas atualizadas" para este usuário — não é erro, é informação.

### CT-02 — Constraint UNIQUE viola durante update

**Setup:** Duas linhas com user_id = old_uuid em tabela com unique constraint em outro campo.
Migrar ambas para new_uuid viola o UNIQUE.

**Esperado:**
- Error capturado: "unique constraint violation"
- Record: `{ rowsAffected: 0, error: "unique constraint..." }`
- Outras linhas/tabelas continuam sendo migradas
- Relatório indica o erro com contexto (tabela, coluna)
- Rollback disponível para reverter o que foi feito antes do erro

**Falha:** Crash global, ou constraint violada silenciosamente.

### CT-03 — Foreign key constraint durante update

**Setup:** `user_id` em tabela filha referencia `id` em tabela pai via FK.
Atualizar filha primeiro, antes de atualizar pai, viola FK.

**Esperado:** Erro capturado, relatório indica ordem de tabelas como possível causa.
**Nota:** Este é um caso que requer que o usuário especifique a ordem das tabelas.

### CT-04 — UUID inválido no banco (dado legado corrompido)

**Setup:** `old_uuid` no banco não é UUID válido (e.g., `"user-123"` formato legado).

**Esperado:**
- UUID validation em `batch-updater.ts` detecta o UUID inválido na mapping
- Registro de erro: "UUID inválido: old=user-123"
- Zero updates para este mapeamento
- Outros mapeamentos válidos continuam

### CT-05 — Backup em disco cheio

Simular disco cheio antes de `createBackup()`:
```bash
fallocate -l 99G /tmp/fill  # preencher disco
lovable-migrate sync-users ...
rm /tmp/fill
```

**Esperado:** Erro claro "falha ao criar backup: No space left on device", exit 1, zero updates.
**Falha:** Crash não tratado, arquivo de backup criado parcialmente, updates executados sem backup.

---

## 8. Network Failure Tests

### NF-01 — URL inexistente

```bash
lovable-migrate sync-users \
  --old-url https://naoexiste123456.supabase.co \
  --old-key <service_role_valido> ...
```
**Esperado:** "Não foi possível conectar ao projeto ANTIGO: host não encontrado", exit 1 < 10 segundos.
**Falha:** Hang por mais de 30 segundos antes de falhar.

### NF-02 — Autenticação expirada durante execução

**Setup:** Iniciar migração com key válida, invalidar a key no meio da execução (revogar via dashboard).

**Esperado:** Updates subsequentes falham com "401 Unauthorized", processo capta erros,
termina com relatório de falha, backup disponível para rollback.

### NF-03 — Rate limit do Supabase

**Setup:** Executar 1000+ updates em rápida sucessão.

**Esperado:**
- Rate limit capturado (429 Too Many Requests)
- Processo pausa e reinicia com backoff exponencial
- Ou: processo reporta falha com instruções ("reduza batch size, tente novamente")

**Status atual:** Este comportamento NÃO está implementado (sem retry logic). Deve reportar falha.

### NF-04 — Timeout durante execução

**Setup:** Proxy entre CLI e Supabase com delay de 60 segundos.

**Esperado:** Timeout capturado em < 30 segundos (com timeout configurado).
**Status atual:** Sem timeout configurado — vai travar indefinidamente. **BUG CONHECIDO.**

---

## 9. Schema Drift Tests

### SD-01 — Tabela removida entre discovery e execução

1. Executar discovery (buildUserSyncPlan) — tabela `orders` detectada
2. Antes da execução: dropar tabela `orders` no banco
3. Executar updates

**Esperado:** Error capturado para `orders` ("relation does not exist"), outras tabelas continuam.

### SD-02 — Coluna renomeada entre discovery e execução

1. Descobrir coluna `user_id` na tabela `profiles`
2. Antes da execução: renomear para `owner_id`
3. Executar updates

**Esperado:** UPDATE retorna 0 rows affected (coluna não existe mais), registrado como aviso.

### SD-03 — Tipo da coluna alterado

1. Coluna `user_id TEXT` alterada para `user_id INTEGER`

**Esperado:** Erro de tipo capturado no UPDATE, não crash global.

### SD-04 — Schema com tabelas desconhecidas (sem nome no DEFAULT_USER_ID_COLUMNS)

**Setup:** Tabela `workspace_members` com coluna `creator_uuid` (não está na lista padrão).

**Execução:**
```bash
lovable-migrate sync-users ... --extra-columns workspace_members.creator_uuid
```

**Esperado:** Coluna incluída na migração, updates executados corretamente.

---

## 10. Multi-provider Tests

### MP-01 — Usuário no OLD usa Google, no NEW usa email+senha

**Esperado:** Match por email ainda funciona. Confidence score penalizado (-10 provedor diferente).
Badge "medium" exibido na TUI. Usuário informado da diferença de provedor.

### MP-02 — Usuário sem provider (conta anônima)

**Esperado:** Match via email ainda funciona se email preenchido. Se não tiver email, `unmatchedOldCount++`.

### MP-03 — Múltiplos providers para mesmo email

**Setup:** Usuário faz login com Google E email+senha para o mesmo endereço no NEW → dois auth.users com mesmo email.

**Esperado:** Aviso "email duplicado detectado em novo projeto: alice@test.com". Apenas um mapeamento criado (o mais recente, ou o que tiver mais dados).

---

## 11. Duplicate Email Tests

### DE-01 — Email duplicado no OLD project

**Setup:** Dois users com `alice@test.com` no OLD (bug histórico).

**Esperado:** Aviso de ambiguidade. Apenas um mapeamento criado. Outros dados: sem mapeamento, com aviso explícito.

### DE-02 — Email duplicado no NEW project

Ver MP-03.

### DE-03 — Emails case-sensitivity edge case

**Setup:** OLD tem `Alice@EXAMPLE.COM`, NEW tem `alice@example.com`.

**Esperado:** Match realizado (case-insensitive). Confidence: high (se mesmo provider).

---

## 12. Missing User Tests

### MU-01 — Usuário OLD sem conta no NEW

**Esperado:** `unmatchedOldCount: 1`, aviso "alice@test.com não encontrada no projeto novo".
Sem updates para este usuário. Registros com old_uuid permanecem intocados.

### MU-02 — Todos os usuários OLD sem conta no NEW

**Esperado:** `mappings: []`, `unmatchedOldCount: N`. Saída clara: "nenhum usuário correspondente encontrado — verifique se os usuários foram re-cadastrados no novo projeto". Exit 0 (não é erro, é um aviso).

### MU-03 — Usuário OLD e NEW com mesmo UUID

**Setup:** `old_uuid === new_uuid` para um usuário (conta migrada sem UUID change).

**Esperado:** Aviso "mesmo UUID detectado — nenhum update necessário para alice@test.com". Skip automático.

---

## 13. Partial Migration Tests

### PM-01 — Interromper após 50% e verificar estado

Após IT-02, verificar banco:
- 50% das linhas com new_uuid
- 50% com old_uuid
- Backup completo ainda disponível
- Relatório de rollback gerado automaticamente após interrupção

### PM-02 — Segunda execução após migração parcial (idempotência)

Após PM-01, executar migração completa novamente:

**Esperado:**
- Conflict detection detecta new_uuid já presentes em algumas linhas
- Aviso: "X usuários já parecem migrados nesta tabela"
- Pergunta: "prosseguir com update parcial ou rollback primeiro?"

**Status atual:** Comportamento não definido — pode re-atualizar linhas já migradas sem aviso. **GAP.**

---

## 14. Cenário Real: Migração Completa do Zero

### Sequência exata de testes para homologação de produção

**Pré-condições:**
- Projeto Lovable exportado com 50+ usuários reais
- Novo Supabase com schema idêntico
- Usuários convidados a se re-cadastrar (pelo menos 20 já o fizeram)
- Backup externo do OLD antes de começar (dump Supabase)

**Passo 1 — Smoke test** (5 min):
```bash
lovable-migrate sync-users --old-url ... --new-url ... --dry-run --verbose
```
Verificar: usuários detectados, colunas detectadas, sem erros de configuração.

**Passo 2 — Dry-run com revisão** (10 min):
- Revisar relatório HTML gerado
- Verificar lista de usuários com confidence scores
- Verificar lista de tabelas/colunas que serão atualizadas
- Verificar conflitos detectados (se houver)
- Verificar usuários sem match (unmatchedOldCount)
- **Critério de go/no-go:** 0 conflitos ou conflitos explicados. Confidence: > 80% high.

**Passo 3 — Execução real com backup** (15–60 min dependendo do volume):
```bash
lovable-migrate sync-users \
  --old-url ... --old-key ... \
  --new-url ... --new-key ... \
  --backup-dir ./backups-prod/$(date +%Y%m%d) \
  --verbose 2>&1 | tee sync-$(date +%Y%m%d-%H%M%S).log
```

**Passo 4 — Verificação pós-migração** (20 min):
```sql
-- Em cada tabela migrada:
SELECT COUNT(*) FROM <tabela> WHERE user_id IN (<lista de old_uuids>);
-- Esperado: 0 em todas as tabelas

-- Verificar integridade FK (se aplicável)
SELECT COUNT(*) FROM <tabela_filha> t
  LEFT JOIN <tabela_pai> p ON t.user_id = p.id
  WHERE p.id IS NULL;
-- Esperado: 0

-- Verificar total de registros preservado
SELECT COUNT(*) FROM <tabela>;
-- Deve ser igual ao snapshot pré-migração
```

**Passo 5 — Teste funcional da aplicação** (30 min):
- Login com uma conta migrada → dados aparecem corretamente
- Login com conta NÃO migrada → dados do app aparecem (confirmando que old data não desapareceu)
- Criar novo registro → atribui corretamente ao new_uuid

**Critérios de aprovação:**
- [ ] 0 old_uuids restantes nas tabelas migradas
- [ ] 0 violações de FK após migração
- [ ] Contagem total de registros preservada em todas as tabelas
- [ ] Aplicação funciona normalmente para usuários migrados
- [ ] Arquivo de backup existe e é válido (JSON parseable)
- [ ] HTML report gerado e acessível
- [ ] Log completo salvo para auditoria

**Sinais de corrupção:**
- Linhas duplicadas após migração (indica UPDATE executado mais de uma vez)
- FK violations (tabelas atualizadas fora de ordem)
- Registros desaparecidos (contagem menor que antes)
- Usuários reclamam de "dados sumidos" (old_uuid nunca foi atualizado)

**Tempo esperado total:** 90 minutos para 50 usuários, 10 tabelas.

---

## 15. Critérios Gerais de Aprovação para Produção

### Funcionais (TODOS obrigatórios)

- [ ] ST-01 a ST-05 passam
- [ ] E2E-01 a E2E-05 passam
- [ ] RB-01 e RB-04 passam
- [ ] IT-01 e IT-02 passam (interrupção limpa)
- [ ] CT-01 e CT-02 passam
- [ ] NF-01 e NF-02 passam

### Performance (thresholds mínimos)

- [ ] Discovery < 60 segundos para 1.000 usuários, 20 tabelas
- [ ] 100 updates/minuto sustentados sem degradação
- [ ] Memória pico < 512 MB para 1.000 usuários
- [ ] Backup e rollback < 10 segundos para 100 entradas

### Segurança

- [ ] Anon key rejeitada na validação de config (pré-rede)
- [ ] URLs não-Supabase rejeitadas
- [ ] HTML report não contém service_role key
- [ ] Logs não expõem keys completas (apenas primeiros 10 chars)

### UX

- [ ] Usuário leigo entende todas as mensagens de erro sem documentação
- [ ] Conflitos explicados em linguagem natural
- [ ] Rollback pode ser executado seguindo apenas a saída do terminal

---

## 16. Issues Conhecidas (pré-E2E)

| ID | Descrição | Severidade | Status |
|----|-----------|------------|--------|
| KI-01 | Sem timeout em nenhuma chamada de rede (fetch, Supabase client) | CRITICAL | Aberto |
| KI-02 | O(n×m) queries sequenciais — 50k calls para 1k users × 50 cols | HIGH | Aberto |
| KI-03 | Backup sem try/catch — disk full causa crash | HIGH | Aberto |
| KI-04 | Restore sem validação do JSON — arquivo corrompido causa crash | HIGH | Aberto |
| KI-05 | Paginação de users: erro em página intermediária drops usuários silenciosamente | HIGH | Aberto |
| KI-06 | Conflict detection N+1 queries — até 5000 queries extras | MEDIUM | Aberto |
| KI-07 | HTML report sem limit de linhas — 10k usuários gera HTML de 10MB+ | MEDIUM | Aberto |
| KI-08 | escapeHtml incompleto (falta aspas/apostrofes) — injection em atributos | MEDIUM | Aberto |
| KI-09 | TUI sem persistência de sessão — crash = perda de progresso | MEDIUM | Aberto |
| KI-10 | useSyncOp: error cast sem verificação de tipo — undefined.message | LOW | Aberto |
| KI-11 | Sem retry logic para rate limiting ou erros transientes | LOW | Aberto |
| KI-12 | Segunda execução após migração parcial sem aviso de idempotência | MEDIUM | Aberto |
