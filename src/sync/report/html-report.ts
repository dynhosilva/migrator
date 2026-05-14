import fs from 'fs';
import path from 'path';
import type { SyncResult } from '../types';

const LEVEL_BADGE: Record<string, string> = {
  high: '<span style="color:#22c55e">● ALTA</span>',
  medium: '<span style="color:#f59e0b">◐ MÉDIA</span>',
  suspicious: '<span style="color:#ef4444">⚠ SUSPEITA</span>',
};

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export function generateHtmlReport(result: SyncResult, outputDir: string): string {
  const id = `sync-${Date.now()}`;
  const { plan } = result;

  const userRows = plan.userMappings.map(m => `
    <tr>
      <td>${escapeHtml(m.email)}</td>
      <td class="mono">${escapeHtml(m.oldUserId)}</td>
      <td class="mono">${escapeHtml(m.newUserId)}</td>
      <td>${LEVEL_BADGE[m.confidence.level] ?? m.confidence.level}</td>
      <td>${m.confidence.score}</td>
    </tr>`).join('');

  const tableRows = plan.columnTargets.map(c => {
    const updated = result.updates
      .filter(u => u.tableName === c.tableName && u.columnName === c.columnName && !u.error)
      .reduce((sum, u) => sum + u.rowsAffected, 0);
    return `
    <tr>
      <td>${escapeHtml(c.tableName)}</td>
      <td>${escapeHtml(c.columnName)}</td>
      <td>${c.estimatedRows < 0 ? '?' : c.estimatedRows}</td>
      <td>${updated}</td>
    </tr>`;
  }).join('');

  const errorsSection = result.errors.length > 0 ? `
    <section>
      <h2>Erros</h2>
      <ul class="errors">${result.errors.map(e => `<li>${escapeHtml(e)}</li>`).join('')}</ul>
    </section>` : '';

  const rollbackSection = result.rollbackPerformed ? `
    <div class="alert alert-warning">
      ⚠ Rollback executado automaticamente após erros. Dados restaurados a partir do backup.
    </div>` : '';

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Relatório de Migração — lovable-migrate</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: system-ui, sans-serif; background: #0f172a; color: #e2e8f0; line-height: 1.6; }
  .container { max-width: 960px; margin: 0 auto; padding: 2rem; }
  h1 { font-size: 1.75rem; font-weight: 700; margin-bottom: 0.25rem; color: #f8fafc; }
  h2 { font-size: 1.125rem; font-weight: 600; margin: 2rem 0 0.75rem; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.05em; }
  .meta { color: #64748b; font-size: 0.875rem; margin-bottom: 2rem; }
  .stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 1rem; margin: 1.5rem 0; }
  .stat { background: #1e293b; border-radius: 0.5rem; padding: 1rem 1.25rem; }
  .stat-label { font-size: 0.75rem; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em; }
  .stat-value { font-size: 1.75rem; font-weight: 700; color: #f8fafc; margin-top: 0.25rem; }
  .stat-value.success { color: #22c55e; }
  table { width: 100%; border-collapse: collapse; background: #1e293b; border-radius: 0.5rem; overflow: hidden; }
  th { background: #0f172a; color: #64748b; font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.05em; padding: 0.75rem 1rem; text-align: left; }
  td { padding: 0.625rem 1rem; border-top: 1px solid #0f172a; font-size: 0.875rem; }
  tr:hover td { background: #263244; }
  .mono { font-family: monospace; font-size: 0.75rem; color: #94a3b8; }
  .badge { display: inline-block; padding: 0.125rem 0.5rem; border-radius: 9999px; font-size: 0.75rem; font-weight: 600; }
  .alert { padding: 0.75rem 1rem; border-radius: 0.5rem; margin: 1rem 0; }
  .alert-warning { background: #451a03; border: 1px solid #92400e; color: #fbbf24; }
  .errors li { color: #f87171; margin: 0.25rem 0 0 1.25rem; font-family: monospace; font-size: 0.875rem; }
  section { margin-top: 2.5rem; }
  .footer { margin-top: 3rem; color: #475569; font-size: 0.75rem; border-top: 1px solid #1e293b; padding-top: 1rem; }
  .dry-run-banner { background: #1c1917; border: 1px solid #78716c; color: #d6d3d1; padding: 0.75rem 1rem; border-radius: 0.5rem; margin-bottom: 1.5rem; }
</style>
</head>
<body>
<div class="container">
  <h1>Relatório de Migração</h1>
  <div class="meta">
    ID: ${id} &nbsp;·&nbsp;
    ${result.dryRun ? '<strong>DRY RUN</strong> &nbsp;·&nbsp;' : ''}
    ${escapeHtml(result.executedAt)} &nbsp;·&nbsp;
    ${(result.durationMs / 1000).toFixed(1)}s
    ${result.backupFile ? `&nbsp;·&nbsp; Backup: <code style="font-size:0.75rem;color:#64748b">${escapeHtml(result.backupFile)}</code>` : ''}
  </div>

  ${result.dryRun ? '<div class="dry-run-banner">🔍 Este é um relatório de DRY RUN — nenhuma alteração foi executada.</div>' : ''}
  ${rollbackSection}

  <div class="stats">
    <div class="stat">
      <div class="stat-label">Usuários mapeados</div>
      <div class="stat-value">${plan.userMappings.length}</div>
    </div>
    <div class="stat">
      <div class="stat-label">Registros atualizados</div>
      <div class="stat-value${result.dryRun ? '' : ' success'}">${result.dryRun ? plan.estimatedTotalUpdates + '*' : result.totalRowsUpdated}</div>
    </div>
    <div class="stat">
      <div class="stat-label">Tabelas afetadas</div>
      <div class="stat-value">${result.dryRun ? plan.columnTargets.filter(c => c.estimatedRows > 0).length : result.tablesUpdated.length}</div>
    </div>
    <div class="stat">
      <div class="stat-label">Erros</div>
      <div class="stat-value${result.errors.length > 0 ? '' : ' success'}">${result.errors.length}</div>
    </div>
  </div>

  <section>
    <h2>Usuários (${plan.userMappings.length})</h2>
    <table>
      <thead><tr><th>Email</th><th>UUID antigo</th><th>UUID novo</th><th>Confiança</th><th>Score</th></tr></thead>
      <tbody>${userRows || '<tr><td colspan="5" style="color:#64748b">Nenhum mapeamento</td></tr>'}</tbody>
    </table>
  </section>

  <section>
    <h2>Colunas detectadas (${plan.columnTargets.length})</h2>
    <table>
      <thead><tr><th>Tabela</th><th>Coluna</th><th>Estimado</th><th>Atualizado</th></tr></thead>
      <tbody>${tableRows || '<tr><td colspan="4" style="color:#64748b">Nenhuma coluna</td></tr>'}</tbody>
    </table>
  </section>

  ${errorsSection}

  ${plan.warnings.length > 0 ? `
  <section>
    <h2>Avisos (${plan.warnings.length})</h2>
    <ul class="errors" style="color:#fbbf24">
      ${plan.warnings.map(w => `<li>${escapeHtml(w)}</li>`).join('')}
    </ul>
  </section>` : ''}

  <div class="footer">
    Gerado por <strong>lovable-migrate</strong> &nbsp;·&nbsp;
    ${result.dryRun ? 'Dry Run' : result.success ? 'Migração concluída com sucesso' : 'Migração com erros'}
  </div>
</div>
</body>
</html>`;

  fs.mkdirSync(outputDir, { recursive: true });
  const reportFile = path.join(outputDir, `${id}.html`);
  fs.writeFileSync(reportFile, html, 'utf-8');
  return reportFile;
}
