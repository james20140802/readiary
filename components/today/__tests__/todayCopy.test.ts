import { describe, expect, it } from 'vitest';
import {
  buildWeekDiary,
  readingFraction,
  recallKicker,
  todayHeading,
  weekOrdinal,
} from '../todayCopy';
import type { RecentEntry } from '@/lib/dashboard/fetchRecentEntries';

const entry = (id: string, date: string, extra: Partial<RecentEntry> = {}): RecentEntry => ({
  id,
  quote: `문장 ${id}`,
  note: null,
  date,
  createdAt: `${date}T10:00:00+09:00`,
  userBookId: 'ub1',
  bookTitle: '소유냐 존재냐',
  bookAuthor: '에리히 프롬',
  ...extra,
});

describe('todayHeading', () => {
  it('날짜 숫자·달·요일을 KST 날짜 문자열로만 만든다', () => {
    expect(todayHeading('2026-10-06')).toEqual({ day: '6', month: '10월', weekday: '화요일' });
  });
});

describe('weekOrdinal', () => {
  it('이번 주에 남길 다음 문장의 순서를 말한다', () => {
    expect(weekOrdinal(0)).toBe('이번 주 첫 문장');
    expect(weekOrdinal(1)).toBe('이번 주 두 번째 문장');
    expect(weekOrdinal(9)).toBe('이번 주 열 번째 문장');
    expect(weekOrdinal(11)).toBe('이번 주 12번째 문장');
  });
});

describe('recallKicker', () => {
  it('몇 년 전 오늘이면 그 사실을 먼저', () => {
    expect(recallKicker({ date: '2025-10-06', yearsAgo: 1 }, '2026-10-06')).toBe(
      '1년 전 오늘 · 2025년 10월 6일'
    );
  });
  it('같은 해면 며칠 전과 달·일', () => {
    expect(recallKicker({ date: '2026-09-16', yearsAgo: null }, '2026-10-06')).toBe(
      '20일 전 · 9월 16일'
    );
  });
  it('두 달이 넘으면 달 단위', () => {
    expect(recallKicker({ date: '2026-06-01', yearsAgo: null }, '2026-10-06')).toBe(
      '4달 전 · 6월 1일'
    );
  });
  it('해가 바뀌면 연도를 붙인다', () => {
    expect(recallKicker({ date: '2025-12-20', yearsAgo: null }, '2026-01-10')).toBe(
      '21일 전 · 2025년 12월 20일'
    );
  });
});

describe('readingFraction', () => {
  it('읽은 쪽과 전체 쪽수가 있으면 분수', () => {
    expect(readingFraction({ last_read_page: 184, progress: 52, total: 352 })).toEqual({
      now: '184',
      of: '/ 352',
    });
  });
  it('전체 쪽수가 없으면 읽은 쪽만', () => {
    expect(readingFraction({ last_read_page: 42, progress: null, total: null })).toEqual({
      now: '42',
      of: '쪽',
    });
  });
  it('쪽 정보가 없으면 진행률, 그것도 없으면 없음', () => {
    expect(readingFraction({ last_read_page: null, progress: 30, total: null })).toEqual({
      now: '30',
      of: '%',
    });
    expect(readingFraction({ last_read_page: null, progress: null, total: 300 })).toBeNull();
  });
});

describe('buildWeekDiary', () => {
  it('최근 기록을 날짜별로 묶어 최신 날부터, 쉰 날은 이어진 만큼 한 줄로', () => {
    const rows = buildWeekDiary(
      [
        entry('a', '2026-10-06'),
        entry('b', '2026-10-06'),
        entry('c', '2026-10-04', { quote: null, note: '생각 c' }),
        entry('d', '2026-10-01'),
      ],
      '2026-10-06'
    );
    expect(rows).toEqual([
      expect.objectContaining({ kind: 'day', date: '2026-10-06', label: '오늘', more: 2 - 1 }),
      { kind: 'rest', from: '2026-10-05', to: '2026-10-05', label: '10.5' },
      expect.objectContaining({ kind: 'day', date: '2026-10-04', label: '일', more: 0 }),
      { kind: 'rest', from: '2026-10-02', to: '2026-10-03', label: '10.2 – 10.3' },
      expect.objectContaining({ kind: 'day', date: '2026-10-01', label: '목' }),
      { kind: 'rest', from: '2026-09-30', to: '2026-09-30', label: '9.30' },
    ]);
    const first = rows[0];
    expect(first.kind === 'day' && first.entry.id).toBe('a');
    const third = rows[2];
    expect(third.kind === 'day' && third.text).toBe('생각 c');
  });

  it('오늘 아직 기록이 없으면 오늘 줄은 만들지 않는다', () => {
    const rows = buildWeekDiary([entry('a', '2026-10-05')], '2026-10-06');
    expect(rows[0]).toEqual(expect.objectContaining({ kind: 'day', date: '2026-10-05' }));
  });

  it('7일보다 오래된 기록은 넣지 않는다', () => {
    expect(buildWeekDiary([entry('a', '2026-09-20')], '2026-10-06')).toEqual([]);
  });

  it('최근 기록이 상한만큼 차 있으면 쉰 날도 날짜별 개수도 단정하지 않는다', () => {
    const six = [
      entry('a', '2026-10-06'),
      entry('b', '2026-10-06'),
      entry('c', '2026-10-05'),
      entry('d', '2026-10-04'),
      entry('e', '2026-10-04'),
      entry('f', '2026-10-04'),
    ];
    const rows = buildWeekDiary(six, '2026-10-06');
    expect(rows.map((r) => (r.kind === 'day' ? r.date : 'rest'))).toEqual([
      '2026-10-06',
      '2026-10-05',
      '2026-10-04',
    ]);
    const last = rows[2];
    expect(last.kind === 'day' && last.more).toBeNull();
    // 소급해 쓴 기록이 어제를 밀어내도 어제를 쉰 날로 그리지 않는다
    const gap = buildWeekDiary(
      [...six.slice(0, 5).map((e) => ({ ...e, date: '2026-10-06' })), entry('z', '2026-09-20')]
        .slice(0, 5)
        .concat(entry('y', '2026-10-03')),
      '2026-10-06'
    );
    expect(gap.some((r) => r.kind === 'rest')).toBe(false);
    const first = rows[0];
    expect(first.kind === 'day' && first.more).toBeNull();
  });

  it('문장도 생각도 없는 기록은 건너뛴다', () => {
    expect(
      buildWeekDiary([entry('a', '2026-10-06', { quote: null, note: null })], '2026-10-06')
    ).toEqual([]);
  });
});
