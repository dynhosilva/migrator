import type { ConfidenceScore, ConfidenceLevel } from '../types';

export interface ScoredUser {
  id: string;
  email?: string;
  createdAt: string;
  provider?: string;
}

export function scoreMatch(oldUser: ScoredUser, newUser: ScoredUser): ConfidenceScore {
  let score = 70;
  const reasons: string[] = ['Email correspondente'];

  const oldProvider = oldUser.provider;
  const newProvider = newUser.provider;

  if (oldProvider && newProvider) {
    if (oldProvider === newProvider) {
      score += 20;
      reasons.push(`Mesmo provedor de login (${oldProvider})`);
    } else {
      score -= 10;
      reasons.push(`Provedor diferente: ${oldProvider} → ${newProvider}`);
    }
  }

  const newCreatedMs = new Date(newUser.createdAt).getTime();
  const daysSinceNewCreated = (Date.now() - newCreatedMs) / 86_400_000;
  if (daysSinceNewCreated < 7) {
    score -= 20;
    reasons.push(`Conta criada há ${Math.round(daysSinceNewCreated)} dia(s) no novo projeto — verificar`);
  }

  const oldCreatedMs = new Date(oldUser.createdAt).getTime();
  const daysBetween = Math.abs(newCreatedMs - oldCreatedMs) / 86_400_000;
  if (daysBetween < 30) {
    score += 10;
    reasons.push('Datas de criação próximas');
  }

  const clamped = Math.max(0, Math.min(100, score));
  const level: ConfidenceLevel = clamped >= 80 ? 'high' : clamped >= 55 ? 'medium' : 'suspicious';

  return { score: clamped, level, reasons };
}
