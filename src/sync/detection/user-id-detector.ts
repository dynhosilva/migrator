import { fetchOpenApiSpec, findUserIdColumns } from '../../integrations/supabase/schema-inspector';
import type { SupabaseConfig } from '../../integrations/supabase/types';
import type { ColumnTarget } from '../types';

export async function detectUserIdColumns(
  config: SupabaseConfig,
  extraColumns: string[] = [],
  skipTables: string[] = [],
  skipColumns: string[] = [],
): Promise<ColumnTarget[]> {
  const spec = await fetchOpenApiSpec(config);
  const found = findUserIdColumns(spec, extraColumns);

  return found
    .filter(c => !skipTables.includes(c.tableName))
    .filter(c => !skipColumns.includes(c.columnName))
    .map(c => ({ ...c, estimatedRows: 0 }));
}
