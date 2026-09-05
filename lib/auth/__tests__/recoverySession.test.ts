import { describe, expect, it } from 'vitest';
import { hasRecoveryMethod } from '../recoverySession';

describe('hasRecoveryMethod', () => {
  it('amr에 recovery가 있으면 참 — 갱신 토큰(token_refresh)이 앞에 와도', () => {
    expect(hasRecoveryMethod({ amr: [{ method: 'recovery', timestamp: 1 }] })).toBe(true);
    expect(
      hasRecoveryMethod({
        amr: [
          { method: 'token_refresh', timestamp: 2 },
          { method: 'recovery', timestamp: 1 },
        ],
      })
    ).toBe(true);
  });

  it('일반 로그인 세션(password·oauth)은 거짓', () => {
    expect(hasRecoveryMethod({ amr: [{ method: 'password', timestamp: 1 }] })).toBe(false);
    expect(hasRecoveryMethod({ amr: [{ method: 'oauth', timestamp: 1 }] })).toBe(false);
  });

  it('claims가 없거나 amr이 이상하면 거짓', () => {
    expect(hasRecoveryMethod(null)).toBe(false);
    expect(hasRecoveryMethod({})).toBe(false);
    expect(hasRecoveryMethod({ amr: 'recovery' })).toBe(false);
    expect(hasRecoveryMethod({ amr: [null, {}] })).toBe(false);
  });
});
