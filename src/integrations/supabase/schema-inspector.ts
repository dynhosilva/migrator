import type { SupabaseConfig, OpenApiSpec } from './types';
import { fetchWithTimeout, DEFAULT_TIMEOUTS } from '../../sync/utils/timeout';
import { withRetry, DEFAULT_RETRY } from '../../sync/utils/retry';

export interface ColumnTarget {
  tableName: string;
  columnName: string;
}

export interface FetchSchemaOptions {
  timeoutMs?: number;
}

const DEFAULT_USER_ID_COLUMNS = new Set([
  'user_id',
  'profile_id',
  'owner_id',
  'created_by',
  'updated_by',
  'author_id',
  'account_id',
  'member_id',
  'customer_id',
  'subscriber_id',
]);

export async function fetchOpenApiSpec(
  config: SupabaseConfig,
  opts: FetchSchemaOptions = {},
): Promise<OpenApiSpec> {
  const timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUTS.schemaFetch;
  const url = `${config.url}/rest/v1/`;

  const response = await withRetry(
    () => fetchWithTimeout(url, {
      headers: {
        // Keys are in request headers — never logged by this module
        apikey: config.serviceKey,
        Authorization: `Bearer ${config.serviceKey}`,
      },
    }, timeoutMs),
    DEFAULT_RETRY,
    'fetchOpenApiSpec',
  );

  if (!response.ok) {
    throw new Error(
      `Falha ao buscar schema do projeto (${response.status} ${response.statusText}).\n` +
      `  Verifique se a URL e a chave do projeto estão corretas.`,
    );
  }

  return response.json() as Promise<OpenApiSpec>;
}

export function findUserIdColumns(
  spec: OpenApiSpec,
  extraColumns: string[] = [],
): ColumnTarget[] {
  const targets = new Set([...DEFAULT_USER_ID_COLUMNS, ...extraColumns]);
  const definitions = spec.definitions ?? spec.components?.schemas ?? {};
  const results: ColumnTarget[] = [];

  for (const [tableName, def] of Object.entries(definitions)) {
    if (!def.properties) continue;
    for (const columnName of Object.keys(def.properties)) {
      if (targets.has(columnName)) {
        results.push({ tableName, columnName });
      }
    }
  }

  return results;
}
