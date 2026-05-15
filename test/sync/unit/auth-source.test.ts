import { describe, it, expect } from 'vitest';
import fs from 'fs';
import os from 'os';
import path from 'path';
import {
  validateAuthExport,
  loadAuthExportFromFile,
} from '../../../src/sync/auth-source';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeTempFile(content: string): string {
  const dir = os.tmpdir();
  const file = path.join(dir, `auth-source-test-${Date.now()}-${Math.random().toString(36).slice(2)}.json`);
  fs.writeFileSync(file, content, 'utf-8');
  return file;
}

const VALID_USER_1 = {
  id: 'aaaaaaaa-0000-0000-0000-000000000001',
  email: 'alice@example.com',
  created_at: '2024-01-01T00:00:00Z',
};

const VALID_USER_2 = {
  id: 'bbbbbbbb-0000-0000-0000-000000000002',
  email: 'bob@example.com',
};

// ─── validateAuthExport ───────────────────────────────────────────────────────

describe('validateAuthExport', () => {
  it('accepts { users: [...] } wrapper format', () => {
    const data = { count: 2, users: [VALID_USER_1, VALID_USER_2] };
    const result = validateAuthExport(data);
    expect(result.users).toHaveLength(2);
    expect(result.users[0].id).toBe(VALID_USER_1.id);
    expect(result.users[1].email).toBe('bob@example.com');
  });

  it('accepts array format without wrapper', () => {
    const data = [VALID_USER_1, VALID_USER_2];
    const result = validateAuthExport(data);
    expect(result.users).toHaveLength(2);
  });

  it('preserves created_at when present', () => {
    const result = validateAuthExport({ users: [VALID_USER_1] });
    expect(result.users[0].created_at).toBe('2024-01-01T00:00:00Z');
  });

  it('omits created_at when absent', () => {
    const result = validateAuthExport({ users: [VALID_USER_2] });
    expect(result.users[0].created_at).toBeUndefined();
  });

  it('rejects invalid UUID', () => {
    const data = { users: [{ id: 'not-a-uuid', email: 'alice@example.com' }] };
    expect(() => validateAuthExport(data)).toThrow(/inválido/);
  });

  it('rejects missing id field', () => {
    const data = { users: [{ email: 'alice@example.com' }] };
    expect(() => validateAuthExport(data)).toThrow(/id/);
  });

  it('rejects invalid email', () => {
    const data = { users: [{ id: VALID_USER_1.id, email: 'not-an-email' }] };
    expect(() => validateAuthExport(data)).toThrow(/email/);
  });

  it('rejects missing email field', () => {
    const data = { users: [{ id: VALID_USER_1.id }] };
    expect(() => validateAuthExport(data)).toThrow(/email/);
  });

  it('rejects > 100k users', () => {
    const bigArray = Array.from({ length: 100_001 }, (_, i) => ({
      id: `aaaaaaaa-0000-0000-0000-${String(i).padStart(12, '0')}`,
      email: `user${i}@example.com`,
    }));
    expect(() => validateAuthExport({ users: bigArray })).toThrow(/100/);
  });

  it('rejects non-object/array input', () => {
    expect(() => validateAuthExport(null)).toThrow(/Formato/);
    expect(() => validateAuthExport('string')).toThrow(/Formato/);
    expect(() => validateAuthExport(42)).toThrow(/Formato/);
  });

  it('rejects object without users array', () => {
    expect(() => validateAuthExport({ data: [] })).toThrow(/Formato/);
  });

  it('accepts exactly 100k users', () => {
    const users = Array.from({ length: 100_000 }, (_, i) => ({
      id: `aaaaaaaa-0000-0000-0000-${String(i).padStart(12, '0')}`,
      email: `user${i}@example.com`,
    }));
    const result = validateAuthExport({ users });
    expect(result.users).toHaveLength(100_000);
  });
});

// ─── loadAuthExportFromFile ───────────────────────────────────────────────────

describe('loadAuthExportFromFile', () => {
  it('loads a valid file with wrapper format', () => {
    const content = JSON.stringify({ users: [VALID_USER_1, VALID_USER_2] });
    const file = makeTempFile(content);
    try {
      const result = loadAuthExportFromFile(file);
      expect(result.users).toHaveLength(2);
    } finally {
      fs.unlinkSync(file);
    }
  });

  it('loads a valid file with array format', () => {
    const content = JSON.stringify([VALID_USER_1]);
    const file = makeTempFile(content);
    try {
      const result = loadAuthExportFromFile(file);
      expect(result.users).toHaveLength(1);
    } finally {
      fs.unlinkSync(file);
    }
  });

  it('throws when file does not exist', () => {
    const nonExistent = path.join(os.tmpdir(), 'this-file-does-not-exist-12345.json');
    expect(() => loadAuthExportFromFile(nonExistent)).toThrow(/não encontrado/);
  });

  it('throws when file contains invalid JSON', () => {
    const file = makeTempFile('{ not valid json ');
    try {
      expect(() => loadAuthExportFromFile(file)).toThrow(/JSON inválido/);
    } finally {
      fs.unlinkSync(file);
    }
  });

  it('throws when file contains valid JSON but invalid export schema', () => {
    const file = makeTempFile(JSON.stringify({ users: [{ id: 'bad-uuid', email: 'a@b.com' }] }));
    try {
      expect(() => loadAuthExportFromFile(file)).toThrow();
    } finally {
      fs.unlinkSync(file);
    }
  });
});
