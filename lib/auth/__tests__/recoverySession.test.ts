import { describe, expect, it } from 'vitest';
import { hasRecoveryMethod, RECOVERY_WINDOW_SECONDS } from '../recoverySession';

const NOW = 1_800_000_000;

describe('hasRecoveryMethod', () => {
  it('amr에 recovery가 있으면 참 — 갱신 토큰(token_refresh)이 앞에 와도', () => {
    expect(hasRecoveryMethod({ amr: [{ method: 'recovery', timestamp: NOW - 10 }] }, NOW)).toBe(
      true
    );
    expect(
      hasRecoveryMethod(
        {
          amr: [
            { method: 'token_refresh', timestamp: NOW - 5 },
            { method: 'recovery', timestamp: NOW - 600 },
          ],
        },
        NOW
      )
    ).toBe(true);
  });

  it('새 템플릿(token_hash → verifyOtp)은 otp 로 기록된다 — 매직링크와 함께 복구로 본다', () => {
    expect(hasRecoveryMethod({ amr: [{ method: 'otp', timestamp: NOW - 10 }] }, NOW)).toBe(true);
    expect(hasRecoveryMethod({ amr: [{ method: 'magiclink', timestamp: NOW - 10 }] }, NOW)).toBe(
      true
    );
  });

  it('복구 수단이라도 창(1시간)을 넘겼으면 거짓 — 오래된 이메일 인증은 통행증이 아니다', () => {
    const stale = NOW - RECOVERY_WINDOW_SECONDS - 1;
    expect(hasRecoveryMethod({ amr: [{ method: 'otp', timestamp: stale }] }, NOW)).toBe(false);
    expect(hasRecoveryMethod({ amr: [{ method: 'recovery', timestamp: stale }] }, NOW)).toBe(false);
    expect(
      hasRecoveryMethod({ amr: [{ method: 'otp', timestamp: NOW - RECOVERY_WINDOW_SECONDS }] }, NOW)
    ).toBe(true);
  });

  it('서버 시계가 조금 앞서도(5분 이내) 참, 그 이상 미래면 거짓', () => {
    expect(hasRecoveryMethod({ amr: [{ method: 'otp', timestamp: NOW + 60 }] }, NOW)).toBe(true);
    expect(hasRecoveryMethod({ amr: [{ method: 'otp', timestamp: NOW + 3600 }] }, NOW)).toBe(false);
  });

  it('timestamp 가 없으면 최근인지 알 수 없으니 거짓', () => {
    expect(hasRecoveryMethod({ amr: [{ method: 'recovery' }] }, NOW)).toBe(false);
  });

  it('일반 로그인 세션(password·oauth)은 거짓', () => {
    expect(hasRecoveryMethod({ amr: [{ method: 'password', timestamp: NOW }] }, NOW)).toBe(false);
    expect(hasRecoveryMethod({ amr: [{ method: 'oauth', timestamp: NOW }] }, NOW)).toBe(false);
  });

  it('claims가 없거나 amr이 이상하면 거짓', () => {
    expect(hasRecoveryMethod(null, NOW)).toBe(false);
    expect(hasRecoveryMethod({}, NOW)).toBe(false);
    expect(hasRecoveryMethod({ amr: 'recovery' }, NOW)).toBe(false);
    expect(hasRecoveryMethod({ amr: [null, {}] }, NOW)).toBe(false);
  });
});
