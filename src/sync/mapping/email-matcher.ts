import type { SupabaseClient } from '@supabase/supabase-js';
import type { UserMapping } from '../types';
import { scoreMatch, type ScoredUser } from './confidence-scorer';
import { withTimeout, DEFAULT_TIMEOUTS } from '../utils/timeout';
import { withRetry, DEFAULT_RETRY, type RetryOptions } from '../utils/retry';
import type { AuthExportUser } from '../auth-source';

export interface MatchResult {
  mappings: UserMapping[];
  unmatchedOldCount: number;
  warnings: string[];
}

export interface ListUsersOptions {
  timeoutMs?: number;
  retry?: RetryOptions;
}

async function listAllUsers(client: SupabaseClient, opts: ListUsersOptions = {}): Promise<ScoredUser[]> {
  const users: ScoredUser[] = [];
  let page = 1;
  const perPage = 1000;
  const timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUTS.userListPage;
  const retry = opts.retry ?? DEFAULT_RETRY;

  while (true) {
    let pageData: { users: Array<{ id: string; email?: string; created_at: string; app_metadata: Record<string, unknown> }> };

    try {
      const result = await withRetry(
        () => withTimeout(
          client.auth.admin.listUsers({ page, perPage }),
          timeoutMs,
          `listUsers page ${page}`,
        ),
        retry,
        `listUsers page ${page}`,
      );

      if (result.error) {
        if (page === 1) {
          throw new Error(`Falha ao listar usuários: ${result.error.message}`);
        }
        // Mid-pagination failure: warn and return what we have so the caller knows
        // the list is potentially incomplete rather than silently truncating it
        process.stderr.write(
          `[sync] Aviso: falha ao buscar página ${page} de usuários — ` +
          `${users.length} usuário(s) coletados. Detalhe: ${result.error.message}\n`,
        );
        break;
      }

      pageData = result.data as typeof pageData;
    } catch (err) {
      if (page === 1) throw err;
      process.stderr.write(
        `[sync] Aviso: erro na página ${page} — ${users.length} usuário(s) retornados. ` +
        `Detalhe: ${err instanceof Error ? err.message : String(err)}\n`,
      );
      break;
    }

    for (const u of pageData.users) {
      users.push({
        id: u.id,
        email: u.email,
        createdAt: u.created_at,
        provider: u.app_metadata?.provider as string | undefined,
      });
    }

    if (pageData.users.length < perPage) break;
    page++;
  }

  return users;
}

function buildMappings(oldUsers: ScoredUser[], newUsers: ScoredUser[]): MatchResult {
  const newByEmail = new Map(
    newUsers
      .filter(u => u.email)
      .map(u => [u.email!.toLowerCase(), u]),
  );

  const mappings: UserMapping[] = [];
  const warnings: string[] = [];
  let unmatchedOldCount = 0;

  for (const oldUser of oldUsers) {
    const email = oldUser.email?.toLowerCase();

    if (!email) {
      unmatchedOldCount++;
      continue;
    }

    const newUser = newByEmail.get(email);

    if (!newUser) {
      warnings.push(`Sem correspondente no novo projeto para: ${email}`);
      unmatchedOldCount++;
      continue;
    }

    if (oldUser.id === newUser.id) {
      warnings.push(`${email} já possui o mesmo UUID nos dois projetos — ignorado`);
      continue;
    }

    const confidence = scoreMatch(oldUser, newUser);

    mappings.push({
      oldUserId: oldUser.id,
      newUserId: newUser.id,
      email,
      matchMethod: 'email',
      confidence,
    });
  }

  return { mappings, unmatchedOldCount, warnings };
}

export async function matchUsersByEmail(
  oldClient: SupabaseClient,
  newClient: SupabaseClient,
  opts: ListUsersOptions = {},
): Promise<MatchResult> {
  const [oldUsers, newUsers] = await Promise.all([
    listAllUsers(oldClient, opts),
    listAllUsers(newClient, opts),
  ]);

  return buildMappings(oldUsers, newUsers);
}

export async function matchUsersByEmailFromExport(
  exportUsers: AuthExportUser[],
  newClient: SupabaseClient,
  opts: ListUsersOptions = {},
): Promise<MatchResult> {
  const oldUsers: ScoredUser[] = exportUsers.map(u => ({
    id: u.id,
    email: u.email,
    createdAt: u.created_at,
    provider: undefined,
  }));

  const newUsers = await listAllUsers(newClient, opts);

  return buildMappings(oldUsers, newUsers);
}
