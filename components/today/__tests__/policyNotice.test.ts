import { describe, expect, it } from 'vitest';
import { shouldShowPolicyNotice } from '../PolicyNotice';

describe('shouldShowPolicyNotice — 개정 안내는 시행일 하루가 끝날 때까지, 닫지 않았을 때만', () => {
  const at = (iso: string) => Date.parse(iso);

  it('공고일과 시행일 당일에는 보인다', () => {
    expect(shouldShowPolicyNotice(at('2026-10-27T09:00:00+09:00'), false)).toBe(true);
    expect(shouldShowPolicyNotice(at('2026-11-03T23:59:00+09:00'), false)).toBe(true);
  });

  it('시행일 다음 날 0시(KST)부터는 보이지 않는다', () => {
    expect(shouldShowPolicyNotice(at('2026-11-04T00:00:00+09:00'), false)).toBe(false);
  });

  it('이 기기에서 닫았으면 보이지 않는다', () => {
    expect(shouldShowPolicyNotice(at('2026-10-28T09:00:00+09:00'), true)).toBe(false);
  });
});
