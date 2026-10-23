import { describe, expect, it } from 'vitest';
import {
  agoLabel,
  dateParts,
  daysBetween,
  laterLabel,
  monthDay,
  shortDate,
  slipLabel,
  spanSentence,
} from '../dates';

describe('daysBetween', () => {
  it('날짜 문자열 사이의 날 수를 센다(달·해 경계 포함)', () => {
    expect(daysBetween('2026-09-16', '2026-09-16')).toBe(0);
    expect(daysBetween('2026-09-16', '2026-09-18')).toBe(2);
    expect(daysBetween('2026-01-31', '2026-03-01')).toBe(29);
    expect(daysBetween('2025-12-31', '2026-01-01')).toBe(1);
  });
});

describe('laterLabel — 기록한 날로부터 얼마 뒤', () => {
  it.each([
    [0, '같은 날'],
    [1, '하루 뒤'],
    [2, '이틀 뒤'],
    [3, '사흘 뒤'],
    [4, '나흘 뒤'],
    [20, '20일 뒤'],
    [31, '한 달 뒤'],
    [95, '석 달 뒤'],
    [200, '여섯 달 뒤'],
    [400, '1년 뒤'],
    [800, '2년 뒤'],
  ])('%i일 → %s', (days, label) => {
    expect(laterLabel(days)).toBe(label);
  });
});

describe('agoLabel — 오늘로부터 얼마 전', () => {
  it.each([
    [0, '오늘'],
    [1, '어제'],
    [20, '20일 전'],
    [45, '한 달 전'],
    [70, '두 달 전'],
    [370, '1년 전'],
  ])('%i일 → %s', (days, label) => {
    expect(agoLabel(days)).toBe(label);
  });
});

describe('monthDay', () => {
  it('오늘은 "오늘", 올해는 월·일, 다른 해는 연도까지', () => {
    expect(monthDay('2026-10-23', '2026-10-23')).toBe('오늘');
    expect(monthDay('2026-09-18', '2026-10-23')).toBe('9월 18일');
    expect(monthDay('2025-09-18', '2026-10-23')).toBe('2025년 9월 18일');
  });
});

describe('slipLabel — 덧붙인 생각 간지의 머리', () => {
  it('기록한 날에서 덧붙인 날까지(서울 시간)와 덧붙인 날', () => {
    expect(slipLabel('2026-09-16', '2026-09-18T03:00:00Z', '2026-10-06')).toBe(
      '이틀 뒤 · 9월 18일'
    );
    expect(slipLabel('2026-09-16', '2026-10-06T01:00:00Z', '2026-10-06')).toBe('20일 뒤 · 오늘');
  });
  it('UTC로는 전날이어도 서울 날짜로 센다', () => {
    // 2026-09-17T16:00Z = 서울 9월 18일 새벽 1시
    expect(slipLabel('2026-09-16', '2026-09-17T16:00:00Z', '2026-10-06')).toBe(
      '이틀 뒤 · 9월 18일'
    );
  });
});

describe('dateParts — 기록 한 장의 날짜 머리', () => {
  it('날·달·요일·얼마 전', () => {
    expect(dateParts('2026-09-16', '2026-10-06')).toEqual({
      day: 16,
      month: '9월',
      meta: '수요일 · 20일 전',
    });
  });
  it('다른 해면 연도를 메타 앞에 둔다', () => {
    expect(dateParts('2025-09-16', '2026-10-06')?.meta).toBe('2025년 · 화요일 · 1년 전');
  });
  it('잘못된 날짜는 null', () => {
    expect(dateParts('', '2026-10-06')).toBeNull();
  });
});

describe('spanSentence — 발췌집 표제지의 한 줄', () => {
  it('기간과 우리말 셈', () => {
    expect(spanSentence(['2026-08-30', '2026-09-21', '2026-09-02'], 14)).toBe(
      '8월 30일부터 9월 21일까지, 문장 열네 개를 옮겨 적었습니다.'
    );
  });
  it('하루면 그날에', () => {
    expect(spanSentence(['2026-09-21'], 1)).toBe('9월 21일에 문장 한 개를 옮겨 적었습니다.');
  });
  it('해를 넘기면 연도를 함께', () => {
    expect(spanSentence(['2025-12-30', '2026-01-05'], 120)).toBe(
      '2025년 12월 30일부터 2026년 1월 5일까지, 문장 120개를 옮겨 적었습니다.'
    );
  });
  it('날짜가 없으면 셈만', () => {
    expect(spanSentence([], 3)).toBe('문장 세 개를 옮겨 적었습니다.');
  });
});

describe('shortDate — 상단 바 제목', () => {
  it('올해는 월·일, 다른 해는 연도까지(오늘도 날짜로)', () => {
    expect(shortDate('2026-10-23', '2026-10-23')).toBe('10월 23일');
    expect(shortDate('2025-09-16', '2026-10-23')).toBe('2025년 9월 16일');
  });
});
