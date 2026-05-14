import type { SupabaseClient } from '@supabase/supabase-js';
import type { UserMapping } from '../types';
import { scoreMatch, type ScoredUser } from './confidence-scorer';

export interface MatchResult {
  mappings: UserMapping[];
  unmatchedOldCount: number;
  warnings: string[];
}

async function listAllUsers(client: SupabaseClient): Promise<ScoredUser[]> {
  const users: ScoredUser[] = [];
  let page = 1;
  const perPage = 1000;

  while (true) {
    const { data, error } = await client.auth.admin.listUsers({ page, perPage });
    if (error) throw new Error(`Falha ao listar usuários: ${error.message}`);

    for (const u of data.users) {
      users.push({
        id: u.id,
        email: u.email,
        createdAt: u.created_at,
        provider: (u.app_metadata as Record<string, unknown>)?.provider as string | undefined,
      });
    }

    if (data.users.length < perPage) break;
    page++;
  }

  return users;
}

export async function matchUsersByEmail(
  oldClient: SupabaseClient,
  newClient: SupabaseClient,
): Promise<MatchResult> {
  const [oldUsers, newUsers] = await Promise.all([
    listAllUsers(oldClient),
    listAllUsers(newClient),
  ]);

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
      warnings.push(`Usuário ${oldUser.id} sem email — ignorado`);
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
