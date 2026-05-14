import type { SupabaseClient } from '@supabase/supabase-js';
import type { UserMapping, ColumnTarget, ConflictReport } from '../types';

/**
 * Detecta conflitos ANTES de executar updates.
 *
 * Um conflito ocorre quando o new_uuid já possui dados numa tabela alvo —
 * i.e., o usuário criou dados no novo projeto após cadastro. Tentar migrar
 * os dados antigos para o mesmo user_id quebraria constraints de unicidade
 * ou mesclaria dados de forma inesperada.
 *
 * Queries são paralelizadas por coluna para reduzir latência.
 */
export async function detectConflicts(
  client: SupabaseClient,
  mappings: UserMapping[],
  columns: ColumnTarget[],
): Promise<ConflictReport[]> {
  const activeColumns = columns.filter(c => c.estimatedRows > 0);
  if (activeColumns.length === 0 || mappings.length === 0) return [];

  const allConflicts: ConflictReport[] = [];

  for (const col of activeColumns) {
    const newIds = mappings.map(m => m.newUserId);

    const { data, error } = await client
      .from(col.tableName)
      .select(col.columnName)
      .in(col.columnName, newIds);

    if (error || !data) continue;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const foundNewIds = new Set((data as any[]).map(r => r[col.columnName]));

    for (const mapping of mappings) {
      if (!foundNewIds.has(mapping.newUserId)) continue;

      const { count } = await client
        .from(col.tableName)
        .select('*', { count: 'exact', head: true })
        .eq(col.columnName, mapping.newUserId);

      allConflicts.push({
        email: mapping.email,
        newUserId: mapping.newUserId,
        tableName: col.tableName,
        columnName: col.columnName,
        existingRowCount: count ?? 0,
      });
    }
  }

  return allConflicts;
}

/**
 * Formata um conflito em linguagem natural para o usuário.
 */
export function describeConflict(c: ConflictReport): string {
  return (
    `${c.email}: tabela "${c.tableName}" já tem ${c.existingRowCount} ` +
    `registro(s) com o novo UUID — os dados novos serão mesclados com os antigos`
  );
}
