import { describe, it, expect } from 'vitest';
import { validateSyncConfig } from '../../../src/sync/validation/validate-config';
import type { SyncConfig } from '../../../src/sync/index';

const DUMMY_OPTIONS = {
  dryRun: false,
  batchSize: 500,
  skipTables: [],
  skipColumns: [],
  extraColumns: [],
  verbose: false,
};

// Real-looking service_role JWT (role: service_role in payload, not a real key)
// Payload base64: {"role":"service_role","iss":"supabase"}
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiJ9.eyJyb2xlIjoic2VydmljZV9yb2xlIiwiaXNzIjoic3VwYWJhc2UifQ.AAAA';
const ANON_KEY    = 'eyJhbGciOiJIUzI1NiJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlIn0.AAAA';

function makeConfig(overrides: Partial<{
  oldUrl: string; oldKey: string; newUrl: string; newKey: string;
}> = {}): SyncConfig {
  return {
    oldSupabase: {
      url: overrides.oldUrl ?? 'https://abcdef123456.supabase.co',
      serviceKey: overrides.oldKey ?? SERVICE_KEY,
    },
    newSupabase: {
      url: overrides.newUrl ?? 'https://xyz789012345.supabase.co',
      serviceKey: overrides.newKey ?? SERVICE_KEY,
    },
    options: DUMMY_OPTIONS,
  };
}

describe('validateSyncConfig', () => {
  it('passes a valid config', () => {
    const result = validateSyncConfig(makeConfig());
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('rejects same URL for old and new', () => {
    const url = 'https://abcdef123456.supabase.co';
    const result = validateSyncConfig(makeConfig({ oldUrl: url, newUrl: url }));
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('mesmos'))).toBe(true);
  });

  it('rejects invalid old URL format', () => {
    const result = validateSyncConfig(makeConfig({ oldUrl: 'http://myapp.com' }));
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('ANTIGO'))).toBe(true);
  });

  it('rejects invalid new URL format', () => {
    const result = validateSyncConfig(makeConfig({ newUrl: 'not-a-url' }));
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('NOVO'))).toBe(true);
  });

  it('rejects anon key for old project', () => {
    const result = validateSyncConfig(makeConfig({ oldKey: ANON_KEY }));
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('anon') || e.includes('service_role'))).toBe(true);
  });

  it('rejects anon key for new project', () => {
    const result = validateSyncConfig(makeConfig({ newKey: ANON_KEY }));
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('service_role'))).toBe(true);
  });

  it('rejects non-JWT key', () => {
    const result = validateSyncConfig(makeConfig({ oldKey: 'not-a-jwt-at-all' }));
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('ANTIGO'))).toBe(true);
  });

  it('accepts URL with trailing slash', () => {
    const result = validateSyncConfig(makeConfig({
      oldUrl: 'https://abcdef123456.supabase.co/',
      newUrl: 'https://xyz789012345.supabase.co/',
    }));
    expect(result.valid).toBe(true);
  });

  it('accumulates multiple errors', () => {
    const result = validateSyncConfig(makeConfig({
      oldUrl: 'bad',
      newUrl: 'bad',
      oldKey: 'bad',
      newKey: 'bad',
    }));
    expect(result.errors.length).toBeGreaterThanOrEqual(3);
  });
});
