import { describe, expect, it } from 'vitest';
import {
  formatPurgeDate,
  hasPasswordIdentity,
  hasRecentSignIn,
  isAccountDeletionOpen,
} from '../deletion';
import { ACCOUNT_DELETION_EFFECTIVE_AT } from '@/lib/legal/texts';

describe('formatPurgeDate', () => {
  it('KST 기준 날짜로 바꾼다', () => {
    expect(formatPurgeDate('2026-11-26T14:59:59Z')).toBe('11월 26일');
    expect(formatPurgeDate('2026-11-26T15:00:00Z')).toBe('11월 27일');
    expect(formatPurgeDate(new Date('2026-11-26T15:00:00Z'))).toBe('11월 27일');
  });
});

describe('hasRecentSignIn', () => {
  it('가장 늦은 amr 시각이 10분 안이면 true', () => {
    const claims = { amr: [{ method: 'oauth', timestamp: 1000 }] };
    expect(hasRecentSignIn(claims, 1600)).toBe(true);
    expect(hasRecentSignIn(claims, 1601)).toBe(false);
  });
  it('여러 항목이면 가장 늦은 시각을 쓴다', () => {
    const claims = {
      amr: [
        { method: 'password', timestamp: 100 },
        { method: 'oauth', timestamp: 1000 },
      ],
    };
    expect(hasRecentSignIn(claims, 1600)).toBe(true);
  });
  it('amr이 없거나 배열이 아니면 false', () => {
    expect(hasRecentSignIn({}, 1000)).toBe(false);
    expect(hasRecentSignIn({ amr: 'x' }, 1000)).toBe(false);
    expect(hasRecentSignIn(null, 1000)).toBe(false);
    expect(hasRecentSignIn({ amr: [null, { method: 'oauth' }] }, 1000)).toBe(false);
  });
});

describe('isAccountDeletionOpen', () => {
  const at = Date.parse(ACCOUNT_DELETION_EFFECTIVE_AT);
  it('시행일 직전에는 닫히고 시행일부터 열린다', () => {
    expect(isAccountDeletionOpen(new Date(at - 1))).toBe(false);
    expect(isAccountDeletionOpen(new Date(at))).toBe(true);
  });
});

describe('hasPasswordIdentity', () => {
  it('email provider와 이메일이 모두 있어야 true', () => {
    expect(hasPasswordIdentity({ email: 'a@b.c', identities: [{ provider: 'email' }] })).toBe(true);
    expect(hasPasswordIdentity({ email: 'a@b.c', identities: [{ provider: 'google' }] })).toBe(
      false
    );
    expect(hasPasswordIdentity({ email: null, identities: [{ provider: 'email' }] })).toBe(false);
    expect(hasPasswordIdentity({ email: 'a@b.c', identities: null })).toBe(false);
  });
});
