import type { SupabaseClient } from '@supabase/supabase-js';
import type { SyncConfig } from '../index';
import { withTimeout, DEFAULT_TIMEOUTS, SyncTimeoutError } from '../utils/timeout';
import { withRetry, DEFAULT_RETRY } from '../utils/retry';

export interface ConfigValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

const SUPABASE_URL_RE = /^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/;
const JWT_STRUCTURE_RE = /^eyJ[A-Za-z0-9_-]+\.eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/;

function decodeJwtRole(jwt: string): string | null {
  try {
    const part = jwt.split('.')[1];
    if (!part) return null;
    const json = Buffer.from(part, 'base64').toString('utf-8');
    const payload = JSON.parse(json) as Record<string, unknown>;
    return typeof payload['role'] === 'string' ? payload['role'] : null;
  } catch {
    return null;
  }
}

export function validateSyncConfig(config: SyncConfig): ConfigValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  const oldUrl = config.oldSupabase.url.replace(/\/$/, '');
  const newUrl = config.newSupabase.url.replace(/\/$/, '');

  if (!SUPABASE_URL_RE.test(oldUrl)) {
    errors.push(
      `URL do projeto ANTIGO inválida: "${config.oldSupabase.url}"\n` +
      `  Esperado: https://xxxxxxxxxxxxxxxx.supabase.co`,
    );
  }
  if (!SUPABASE_URL_RE.test(newUrl)) {
    errors.push(
      `URL do projeto NOVO inválida: "${config.newSupabase.url}"\n` +
      `  Esperado: https://xxxxxxxxxxxxxxxx.supabase.co`,
    );
  }

  if (oldUrl && newUrl && oldUrl === newUrl) {
    errors.push(
      'Os dois projetos são os mesmos (mesma URL).\n' +
      '  Use URLs diferentes para o projeto antigo e o projeto novo.',
    );
  }

  if (!JWT_STRUCTURE_RE.test(config.oldSupabase.serviceKey)) {
    errors.push(
      'Service Role Key do projeto ANTIGO inválida.\n' +
      '  Copie a chave no Supabase Dashboard → Project Settings → API → service_role.',
    );
  } else {
    const role = decodeJwtRole(config.oldSupabase.serviceKey);
    if (role && role !== 'service_role') {
      errors.push(
        `Chave do projeto ANTIGO é do tipo "${role}" — a migração requer a chave "service_role".\n` +
        '  No Supabase Dashboard → Project Settings → API → Service Role Key (não a anon key).',
      );
    }
  }

  if (!JWT_STRUCTURE_RE.test(config.newSupabase.serviceKey)) {
    errors.push(
      'Service Role Key do projeto NOVO inválida.\n' +
      '  Copie a chave no Supabase Dashboard → Project Settings → API → service_role.',
    );
  } else {
    const role = decodeJwtRole(config.newSupabase.serviceKey);
    if (role && role !== 'service_role') {
      errors.push(
        `Chave do projeto NOVO é do tipo "${role}" — a migração requer a chave "service_role".\n` +
        '  No Supabase Dashboard → Project Settings → API → Service Role Key (não a anon key).',
      );
    }
  }

  return { valid: errors.length === 0, errors, warnings };
}

export async function validateCredentials(
  client: SupabaseClient,
  label: string,
  timeoutMs: number = DEFAULT_TIMEOUTS.credentialCheck,
): Promise<string | null> {
  try {
    const { error } = await withRetry(
      () => withTimeout(
        client.auth.admin.listUsers({ page: 1, perPage: 1 }),
        timeoutMs,
        `credencial ${label}`,
      ),
      { ...DEFAULT_RETRY, maxAttempts: 2 },
      `credencial ${label}`,
    );

    if (!error) return null;

    if (error.status === 401 || error.status === 403) {
      return (
        `Credenciais do projeto ${label} inválidas ou sem permissão.\n` +
        '  Verifique se você está usando a Service Role Key (não a anon key).\n' +
        '  Supabase Dashboard → Project Settings → API → service_role.'
      );
    }
    return `Erro ao conectar no projeto ${label}: ${error.message}`;
  } catch (err) {
    if (err instanceof SyncTimeoutError) {
      return (
        `Tempo limite ao conectar no projeto ${label} (${Math.round(timeoutMs / 1000)}s).\n` +
        '  Verifique se a URL está correta e se há conexão com a internet.'
      );
    }
    const msg = err instanceof Error ? err.message : String(err);
    const isNetwork = msg.includes('ENOTFOUND') || msg.includes('ECONNREFUSED') || msg.includes('fetch');
    if (isNetwork) {
      return (
        `Não foi possível conectar ao projeto ${label}.\n` +
        '  Verifique a URL e a conexão com a internet.'
      );
    }
    return `Erro inesperado ao validar projeto ${label}: ${msg}`;
  }
}
