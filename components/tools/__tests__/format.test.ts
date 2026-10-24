import { describe, expect, it } from 'vitest';
import { dayLabel, pageLabel, shortEntryDate, summarizeWeek } from '../format';

describe('shortEntryDate — 기록 줄 왼쪽 날짜 칸', () => {
  it('올해 기록은 월.일만', () => {
    expect(shortEntryDate('2026-09-29', '2026-10-23')).toBe('9.29');
  });
  it('지난해 기록은 두 자리 연도를 붙인다', () => {
    expect(shortEntryDate('2025-12-03', '2026-10-23')).toBe('25.12.3');
  });
  it('형식이 틀리면 그대로 돌려준다', () => {
    expect(shortEntryDate('언젠가', '2026-10-23')).toBe('언젠가');
  });
});

describe('pageLabel — 쪽은 선택 정보', () => {
  it('쪽이 없으면 null', () => {
    expect(pageLabel(null, null)).toBeNull();
  });
  it('한 쪽', () => {
    expect(pageLabel(96, null)).toBe('p.96');
    expect(pageLabel(96, 96)).toBe('p.96');
  });
  it('쪽 범위', () => {
    expect(pageLabel(96, 98)).toBe('p.96–98');
  });
});

describe('dayLabel — 날짜 묶음 머리', () => {
  it('월·일·요일을 문자열로만 계산한다', () => {
    expect(dayLabel('2026-10-21')).toBe('10월 21일 수요일');
    expect(dayLabel('2026-10-18')).toBe('10월 18일 일요일');
  });
  it('형식이 틀리면 그대로', () => {
    expect(dayLabel('x')).toBe('x');
  });
});

describe('summarizeWeek — 이번 주 요약 한 줄', () => {
  const row = (title: string | null, quote: string | null, note: string | null) => ({
    title,
    quote,
    note,
  });
  it('책 수와 문장·생각 수를 센다', () => {
    expect(
      summarizeWeek([
        row('소유냐 존재냐', '문장', null),
        row('소유냐 존재냐', '문장', '생각'),
        row('에로스의 종말', null, '생각'),
      ])
    ).toBe('이번 주엔 두 권에서 문장 두 개와 생각 두 개를 남겼어요.');
  });
  it('생각만 있으면 생각만 말한다', () => {
    expect(summarizeWeek([row('리만 가설', null, '생각')])).toBe(
      '이번 주엔 한 권에서 생각 한 개를 남겼어요.'
    );
  });
  it('문장도 생각도 없으면 기록 수로', () => {
    expect(summarizeWeek([row('리만 가설', null, null)])).toBe(
      '이번 주엔 한 권에서 기록 한 개를 남겼어요.'
    );
  });
  it('열을 넘는 수는 숫자로', () => {
    const rows = Array.from({ length: 12 }, () => row('책', '문장', null));
    expect(summarizeWeek(rows)).toBe('이번 주엔 한 권에서 문장 12개를 남겼어요.');
  });
});
