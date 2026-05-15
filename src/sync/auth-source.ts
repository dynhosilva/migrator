import fs from 'fs';
import { fetchWithTimeout, DEFAULT_TIMEOUTS } from './utils/timeout';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AuthExportUser {
  id: string;
  email: string;
  created_at?: string;
}

export interface AuthExport {
  count?: number;
  users: AuthExportUser[];
}

export type OldProjectSource =
  | { kind: 'service-key'; url: string; serviceKey: string }
  | { kind: 'json-file'; filePath: string; url?: string }
  | { kind: 'json-url'; exportUrl: string; url?: string };

// ─── Validation helpers ───────────────────────────────────────────────────────

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_USERS = 100_000;

function isValidUuid(v: string): boolean {
  return UUID_RE.test(v);
}

function isValidEmail(v: string): boolean {
  return EMAIL_RE.test(v);
}

function validateUser(u: unknown, index: number): AuthExportUser {
  if (!u || typeof u !== 'object') {
    throw new Error(`Usuário na posição ${index} não é um objeto válido`);
  }
  const obj = u as Record<string, unknown>;

  if (typeof obj['id'] !== 'string' || !obj['id']) {
    throw new Error(`Usuário na posição ${index} não tem campo "id" (string obrigatória)`);
  }
  if (!isValidUuid(obj['id'])) {
    throw new Error(
      `Usuário na posição ${index} tem "id" inválido: "${obj['id']}"\n` +
      '  Esperado: UUID no formato xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
    );
  }

  if (typeof obj['email'] !== 'string' || !obj['email']) {
    throw new Error(`Usuário na posição ${index} não tem campo "email" (string obrigatória)`);
  }
  if (!isValidEmail(obj['email'])) {
    throw new Error(
      `Usuário na posição ${index} tem "email" inválido: "${obj['email']}"`,
    );
  }

  const result: AuthExportUser = {
    id: obj['id'],
    email: obj['email'],
  };

  if (typeof obj['created_at'] === 'string' && obj['created_at']) {
    result.created_at = obj['created_at'];
  }

  return result;
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Validates the raw parsed JSON from an auth export.
 * Accepts both `{ users: [...] }` wrapper format and plain arrays.
 */
export function validateAuthExport(data: unknown): AuthExport {
  let rawUsers: unknown[];

  if (Array.isArray(data)) {
    rawUsers = data;
  } else if (data && typeof data === 'object') {
    const obj = data as Record<string, unknown>;
    if (!Array.isArray(obj['users'])) {
      throw new Error(
        'Formato do export JSON inválido.\n' +
        '  Esperado: { "users": [...] } ou um array direto de usuários.',
      );
    }
    rawUsers = obj['users'] as unknown[];
  } else {
    throw new Error(
      'Formato do export JSON inválido.\n' +
      '  Esperado: { "users": [...] } ou um array direto de usuários.',
    );
  }

  if (rawUsers.length > MAX_USERS) {
    throw new Error(
      `O export contém ${rawUsers.length} usuários, excedendo o limite de ${MAX_USERS.toLocaleString('pt-BR')}.\n` +
      '  Divida o arquivo em partes menores.',
    );
  }

  const users = rawUsers.map((u, i) => validateUser(u, i));

  return { users };
}

/**
 * Reads and validates an auth export from a local file.
 */
export function loadAuthExportFromFile(filePath: string): AuthExport {
  if (!fs.existsSync(filePath)) {
    throw new Error(
      `Arquivo de export não encontrado: "${filePath}"\n` +
      '  Verifique o caminho e tente novamente.',
    );
  }

  let raw: string;
  try {
    raw = fs.readFileSync(filePath, 'utf-8');
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(`Falha ao ler arquivo de export "${filePath}": ${msg}`);
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(`JSON inválido no arquivo "${filePath}": ${msg}`);
  }

  return validateAuthExport(parsed);
}

/**
 * Fetches and validates an auth export from a remote URL.
 */
export async function loadAuthExportFromUrl(
  exportUrl: string,
  timeoutMs: number = DEFAULT_TIMEOUTS.userListPage,
): Promise<AuthExport> {
  let response: Response;
  try {
    response = await fetchWithTimeout(exportUrl, {}, timeoutMs);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(`Falha ao buscar export JSON de "${exportUrl}": ${msg}`);
  }

  if (!response.ok) {
    throw new Error(
      `Falha ao buscar export JSON de "${exportUrl}": HTTP ${response.status} ${response.statusText}`,
    );
  }

  let parsed: unknown;
  try {
    parsed = await response.json() as unknown;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(`Resposta JSON inválida de "${exportUrl}": ${msg}`);
  }

  return validateAuthExport(parsed);
}
