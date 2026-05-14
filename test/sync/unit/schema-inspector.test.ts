import { describe, it, expect } from 'vitest';
import { findUserIdColumns } from '../../../src/integrations/supabase/schema-inspector';
import type { OpenApiSpec } from '../../../src/integrations/supabase/types';

function makeSpec(tables: Record<string, string[]>): OpenApiSpec {
  const definitions: Record<string, { properties: Record<string, { type: string }> }> = {};
  for (const [name, cols] of Object.entries(tables)) {
    definitions[name] = {
      properties: Object.fromEntries(cols.map(c => [c, { type: 'string' }])),
    };
  }
  return { swagger: '2.0', definitions };
}

describe('findUserIdColumns', () => {
  it('detects user_id column', () => {
    const spec = makeSpec({ transactions: ['id', 'user_id', 'amount'] });
    const cols = findUserIdColumns(spec);
    expect(cols).toEqual([{ tableName: 'transactions', columnName: 'user_id' }]);
  });

  it('detects all default columns', () => {
    const spec = makeSpec({
      posts: ['owner_id', 'title'],
      profiles: ['user_id', 'bio'],
      comments: ['author_id', 'body'],
      tasks: ['created_by', 'name'],
    });
    const cols = findUserIdColumns(spec);
    expect(cols.map(c => c.columnName)).toEqual(
      expect.arrayContaining(['owner_id', 'user_id', 'author_id', 'created_by']),
    );
  });

  it('returns nothing when no user columns exist', () => {
    const spec = makeSpec({ logs: ['id', 'message', 'level'] });
    expect(findUserIdColumns(spec)).toHaveLength(0);
  });

  it('detects extra custom columns', () => {
    const spec = makeSpec({ invoices: ['tenant_id', 'amount'] });
    const cols = findUserIdColumns(spec, ['tenant_id']);
    expect(cols).toEqual([{ tableName: 'invoices', columnName: 'tenant_id' }]);
  });

  it('handles OpenAPI 3.0 components.schemas format', () => {
    const spec: OpenApiSpec = {
      openapi: '3.0.0',
      components: {
        schemas: {
          orders: { properties: { user_id: { type: 'string' }, total: { type: 'number' } } },
        },
      },
    };
    const cols = findUserIdColumns(spec);
    expect(cols).toEqual([{ tableName: 'orders', columnName: 'user_id' }]);
  });

  it('handles empty definitions gracefully', () => {
    expect(findUserIdColumns({})).toHaveLength(0);
    expect(findUserIdColumns({ definitions: {} })).toHaveLength(0);
  });

  it('does not duplicate columns when same name matches multiple patterns', () => {
    // user_id is in both default AND extra — should appear once
    const spec = makeSpec({ test: ['user_id'] });
    const cols = findUserIdColumns(spec, ['user_id']);
    expect(cols).toHaveLength(1);
  });

  it('multiple tables each with user_id', () => {
    const spec = makeSpec({
      orders:       ['user_id', 'total'],
      transactions: ['user_id', 'amount'],
      profiles:     ['user_id', 'name'],
    });
    const cols = findUserIdColumns(spec);
    expect(cols).toHaveLength(3);
    expect(cols.map(c => c.tableName)).toEqual(
      expect.arrayContaining(['orders', 'transactions', 'profiles']),
    );
  });
});
