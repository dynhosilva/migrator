import { describe, it, expect } from 'vitest';
import { scoreMatch, type ScoredUser } from '../../../src/sync/mapping/confidence-scorer';

function makeUser(overrides: Partial<ScoredUser> = {}): ScoredUser {
  return {
    id: 'aaaaaaaa-0000-0000-0000-000000000001',
    email: 'user@example.com',
    createdAt: new Date(Date.now() - 180 * 86_400_000).toISOString(), // 180 days ago
    provider: 'email',
    ...overrides,
  };
}

describe('scoreMatch', () => {
  it('baseline: email match gives score ≥ 70', () => {
    const score = scoreMatch(makeUser(), makeUser({ id: 'bbb' }));
    expect(score.score).toBeGreaterThanOrEqual(70);
    expect(score.reasons.some(r => r.includes('Email'))).toBe(true);
  });

  it('same provider adds 20 points → high confidence', () => {
    const old = makeUser({ provider: 'google' });
    const nw = makeUser({ id: 'bbb', provider: 'google' });
    const score = scoreMatch(old, nw);
    expect(score.score).toBeGreaterThanOrEqual(90);
    expect(score.level).toBe('high');
    expect(score.reasons.some(r => r.includes('google'))).toBe(true);
  });

  it('different provider subtracts 10 points', () => {
    const old = makeUser({ provider: 'google' });
    const nw = makeUser({ id: 'bbb', provider: 'github' });
    const scoreWithMismatch = scoreMatch(old, nw);

    const noProvider = makeUser({ provider: undefined });
    const scoreBase = scoreMatch(noProvider, makeUser({ id: 'bbb', provider: undefined }));

    // Different provider should score lower than no provider info
    expect(scoreWithMismatch.score).toBeLessThan(scoreBase.score);
    expect(scoreWithMismatch.reasons.some(r => r.includes('Provedor diferente'))).toBe(true);
  });

  it('very new account (<7 days) flags as suspicious', () => {
    const old = makeUser({ provider: undefined });
    const nw = makeUser({ id: 'bbb', provider: undefined, createdAt: new Date(Date.now() - 2 * 86_400_000).toISOString() });
    const score = scoreMatch(old, nw);
    expect(score.score).toBeLessThan(70);
    expect(score.reasons.some(r => r.includes('dia(s)'))).toBe(true);
  });

  it('close creation dates add 10 points', () => {
    const base = new Date(Date.now() - 90 * 86_400_000);
    const old = makeUser({ createdAt: base.toISOString() });
    const nw = makeUser({ id: 'bbb', createdAt: new Date(base.getTime() + 5 * 86_400_000).toISOString() });
    const scoreDates = scoreMatch(old, nw);

    const farApart = makeUser({ createdAt: base.toISOString() });
    const farNw = makeUser({ id: 'bbb', createdAt: new Date(base.getTime() + 60 * 86_400_000).toISOString() });
    const scoreFar = scoreMatch(farApart, farNw);

    expect(scoreDates.score).toBeGreaterThan(scoreFar.score);
  });

  it('score is clamped to [0, 100]', () => {
    const score = scoreMatch(makeUser(), makeUser({ id: 'bbb' }));
    expect(score.score).toBeGreaterThanOrEqual(0);
    expect(score.score).toBeLessThanOrEqual(100);
  });

  it('level is high when score ≥ 80', () => {
    const old = makeUser({ provider: 'email' });
    const nw = makeUser({ id: 'bbb', provider: 'email' });
    const score = scoreMatch(old, nw);
    // email + same provider + both old accounts → should be high
    if (score.score >= 80) expect(score.level).toBe('high');
    if (score.score >= 55 && score.score < 80) expect(score.level).toBe('medium');
    if (score.score < 55) expect(score.level).toBe('suspicious');
  });

  it('level thresholds: ≥80=high, ≥55=medium, <55=suspicious', () => {
    // Suspicious scenario: new account (2 days) + different provider
    const oldU = makeUser({ provider: 'google' });
    const suspicious = makeUser({
      id: 'bbb',
      provider: 'github',
      createdAt: new Date(Date.now() - 1 * 86_400_000).toISOString(),
    });
    const s = scoreMatch(oldU, suspicious);
    // 70 - 10 (diff provider) - 20 (1 day old) = 40 → suspicious
    expect(s.score).toBeLessThan(55);
    expect(s.level).toBe('suspicious');
  });
});
