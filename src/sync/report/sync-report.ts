import chalk from 'chalk';
import type { SyncResult } from '../types';

export function printSyncReport(result: SyncResult): void {
  const { plan } = result;

  console.log('');
  console.log(chalk.bold('  Sincronização de Usuários — Relatório'));
  console.log('  ' + chalk.dim('─'.repeat(48)));

  if (result.dryRun) {
    console.log(chalk.yellow('  [DRY RUN — nenhuma alteração foi executada]'));
  }

  console.log('');
  console.log(chalk.bold('  Mapeamentos detectados:'));
  if (plan.userMappings.length === 0) {
    console.log(chalk.dim('    nenhum'));
  } else {
    for (const m of plan.userMappings) {
      console.log(
        `    ${chalk.dim(m.oldUserId.slice(0, 8) + '…')}` +
        ` → ${chalk.green(m.newUserId.slice(0, 8) + '…')}` +
        `  ${chalk.dim(m.email)}`,
      );
    }
  }

  console.log('');
  console.log(chalk.bold('  Colunas detectadas:'));
  if (plan.columnTargets.length === 0) {
    console.log(chalk.dim('    nenhuma'));
  } else {
    for (const col of plan.columnTargets) {
      const rows = col.estimatedRows < 0 ? '?' : String(col.estimatedRows);
      const color = col.estimatedRows > 0 ? chalk.cyan : chalk.dim;
      console.log(`    ${color(col.tableName + '.' + col.columnName)}  ${chalk.dim(rows + ' registro(s)')}`);
    }
  }

  console.log('');

  if (result.dryRun) {
    console.log(
      `  ${chalk.yellow('~')}  ${plan.estimatedTotalUpdates} registro(s) seriam atualizados`,
    );
  } else {
    const failed = result.updates.filter(u => !!u.error).length;
    console.log(
      `  ${chalk.green('✔')}  ${result.totalRowsUpdated} registro(s) atualizados` +
      ` em ${result.tablesUpdated.length} tabela(s)`,
    );
    if (failed > 0) {
      console.log(`  ${chalk.red('✖')}  ${failed} atualização(ões) com erro`);
    }
    if (result.backupFile) {
      console.log(`  ${chalk.dim('Backup:')} ${result.backupFile}`);
    }
    if (result.rollbackPerformed) {
      console.log(chalk.red('  ⚠  Rollback executado — verifique os erros abaixo'));
    }
  }

  if (plan.warnings.length > 0) {
    console.log('');
    console.log(chalk.yellow('  Avisos:'));
    for (const w of plan.warnings) {
      console.log(`    ${chalk.dim('·')} ${w}`);
    }
  }

  if (result.errors.length > 0) {
    console.log('');
    console.log(chalk.red('  Erros:'));
    for (const e of result.errors) {
      console.log(`    ${chalk.red('·')} ${e}`);
    }
  }

  const seconds = (result.durationMs / 1000).toFixed(1);
  console.log('');
  console.log(chalk.dim(`  Concluído em ${seconds}s`));
  console.log('');
}
