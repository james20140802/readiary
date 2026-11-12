import { describe, expect, it } from 'vitest';
import {
  expectedPurgeAfter,
  formatPurgeDate,
  formatRestoreDeadline,
  toRestoreDeadlineParam,
  hasPasswordIdentity,
  hasRecentSignIn,
  isAccountDeletionOpen,
  parsePurgeDateParam,
  toPurgeDateParam,
} from '../deletion';
import { ACCOUNT_DELETION_EFFECTIVE_AT } from '@/lib/legal/texts';

describe('formatPurgeDate', () => {
  it('KST 기준 날짜로 바꾼다', () => {
    expect(formatPurgeDate('2026-11-26T14:59:59Z')).toBe('11월 26일');
    expect(formatPurgeDate('2026-11-26T15:00:00Z')).toBe('11월 27일');
    expect(formatPurgeDate(new Date('2026-11-26T15:00:00Z'))).toBe('11월 27일');
  });
});

describe('되돌릴 수 있는 마지막 날', () => {
  it('purge_after(KST 자정)에서 1초 뺀 시각의 KST 날짜다', () => {
    // 2026-11-27 00:00 KST에 지워진다 → 11월 26일까지 되돌릴 수 있다
    expect(formatRestoreDeadline('2026-11-26T15:00:00Z')).toBe('11월 26일');
    expect(formatRestoreDeadline(new Date('2026-11-26T15:00:00Z'))).toBe('11월 26일');
    expect(toRestoreDeadlineParam('2026-11-26T15:00:00Z')).toBe('2026-11-26');
  });
});

describe('expectedPurgeAfter — 신청한 날(KST) + 15일의 0시 KST', () => {
  it('KST 자정 직전에 신청하면 그날부터 센다', () => {
    // 11-12 23:59:59 KST
    const purge = expectedPurgeAfter(new Date('2026-11-12T14:59:59Z'));
    expect(purge.toISOString()).toBe('2026-11-26T15:00:00.000Z');
    expect(formatRestoreDeadline(purge)).toBe('11월 26일');
  });
  it('KST 자정에 신청하면 다음 날부터 센다', () => {
    // 11-13 00:00:00 KST
    const purge = expectedPurgeAfter(new Date('2026-11-12T15:00:00Z'));
    expect(purge.toISOString()).toBe('2026-11-27T15:00:00.000Z');
    expect(formatRestoreDeadline(purge)).toBe('11월 27일');
  });
  it('한낮에 신청해도 마지막 날은 신청일 + 14일', () => {
    expect(formatRestoreDeadline(expectedPurgeAfter(new Date('2026-11-12T03:00:00Z')))).toBe(
      '11월 26일'
    );
  });
});

describe('삭제 예정일 주소 값', () => {
  it('KST 날짜를 YYYY-MM-DD로 싣고, 다시 읽으면 같은 날로 보인다', () => {
    expect(toPurgeDateParam('2026-11-26T14:59:59Z')).toBe('2026-11-26');
    expect(toPurgeDateParam('2026-11-26T15:00:00Z')).toBe('2026-11-27');
    const parsed = parsePurgeDateParam('2026-11-26');
    expect(parsed && formatPurgeDate(parsed)).toBe('11월 26일');
  });
  it('모양이 다르거나 없는 날짜는 받지 않는다', () => {
    expect(parsePurgeDateParam(null)).toBeNull();
    expect(parsePurgeDateParam('2026-13-01')).toBeNull();
    expect(parsePurgeDateParam('2026-02-30')).toBeNull();
    expect(parsePurgeDateParam('<script>')).toBeNull();
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
  it('미래 timestamp는 시계 오차 5분까지만 받는다', () => {
    expect(hasRecentSignIn({ amr: [{ timestamp: 1600 + 301 }] }, 1600)).toBe(false);
    expect(hasRecentSignIn({ amr: [{ timestamp: 1600 + 300 }] }, 1600)).toBe(true);
    expect(hasRecentSignIn({ amr: [{ timestamp: 1600000 }] }, 1600)).toBe(false);
  });
  it('미래 항목은 무시하고 유효한 최근 항목으로 판정한다', () => {
    const claims = { amr: [{ timestamp: 9999999999 }, { timestamp: 1000 }] };
    expect(hasRecentSignIn(claims, 1600)).toBe(true);
    expect(hasRecentSignIn(claims, 1601)).toBe(false);
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
