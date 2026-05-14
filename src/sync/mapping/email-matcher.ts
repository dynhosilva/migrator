import type { SupabaseClient } from '@supabase/supabase-js';
import type { UserMapping } from '../types';

export interface MatchResult {
  mappings: UserMapping[];
  unmatchedOldCount: number;
  warnings: string[];
}

async function listAllUsers(client: SupabaseClient): Promise<Array<{ id: string; email?: string }>> {
  const users: Array<{ id: string; email?: string }> = [];
  let page = 1;
  const perPage = 1000;

  while (true) {
    const { data, error } = await client.auth.admin.listUsers({ page, perPage });
    if (error) throw new Error(`Falha ao listar usuários: ${error.message}`);
    users.push(...data.users.map(u => ({ id: u.id, email: u.email })));
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
      .map(u => [u.email!.toLowerCase(), u.id]),
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

    const newUserId = newByEmail.get(email);

    if (!newUserId) {
      warnings.push(`Sem correspondente no novo projeto para: ${email}`);
      unmatchedOldCount++;
      continue;
    }

    if (oldUser.id === newUserId) {
      warnings.push(`${email} já possui o mesmo UUID nos dois projetos — ignorado`);
      continue;
    }

    mappings.push({
      oldUserId: oldUser.id,
      newUserId,
      email,
      matchMethod: 'email',
    });
  }

  return { mappings, unmatchedOldCount, warnings };
}
