import { describe, expect, it } from 'vitest';
import {
  diaryShelf,
  formatPublishedDate,
  monthRows,
  ordinalCount,
  ordinalVolume,
  withExcerptState,
} from '../meModel';
import type { MonthlySummary } from '@/lib/profile/monthlySummary';

const month = (label: string, count: number, quote?: string, entryId?: string): MonthlySummary => ({
  label,
  count,
  books: [],
  quotes: quote ? [quote] : [],
  quotePreviews: quote && entryId ? [{ entryId, quote }] : [],
});

describe('ordinal', () => {
  it('세는 서수 — 첫 번째, 두 번째, 세 번째…', () => {
    expect(ordinalCount(1)).toBe('첫 번째');
    expect(ordinalCount(2)).toBe('두 번째');
    expect(ordinalCount(3)).toBe('세 번째');
    expect(ordinalCount(4)).toBe('네 번째');
    expect(ordinalCount(11)).toBe('11번째');
  });
  it('권 서수 — 첫째 권, 둘째 권, 셋째 권…', () => {
    expect(ordinalVolume(1)).toBe('첫째 권');
    expect(ordinalVolume(3)).toBe('셋째 권');
    expect(ordinalVolume(12)).toBe('12번째 권');
  });
});

describe('diaryShelf', () => {
  it('가입한 해부터 해마다 한 권 — 맨 앞이 올해', () => {
    const d = diaryShelf('2024-03-08T10:00:00Z', '2026-10-23');
    expect(d.count).toBe(3);
    expect(d.firstYear).toBe(2024);
    expect(d.years).toEqual([2026, 2025, 2024]);
  });
  it('세 권까지만 그린다', () => {
    expect(diaryShelf('2020-01-01T00:00:00Z', '2026-10-23').years).toEqual([2026, 2025, 2024]);
  });
  it('가입일을 모르면 올해 한 권', () => {
    const d = diaryShelf(null, '2026-10-23');
    expect(d.count).toBe(1);
    expect(d.firstYear).toBe(2026);
  });
  it('한국 시간으로 해를 센다 — UTC 12월 31일 밤은 KST 새해', () => {
    expect(diaryShelf('2025-12-31T16:00:00Z', '2026-10-23').firstYear).toBe(2026);
  });
});

describe('formatPublishedDate', () => {
  it('한국 시간 날짜로', () => {
    expect(formatPublishedDate('2026-03-07T16:30:00Z')).toBe('2026년 3월 8일');
  });
  it('없거나 잘못되면 null', () => {
    expect(formatPublishedDate(null)).toBeNull();
    expect(formatPublishedDate('nope')).toBeNull();
  });
});

describe('monthRows', () => {
  it('최근 달부터, 문장과 기록 수와 기록 주소를', () => {
    const rows = monthRows(
      [
        month('2026년 10월', 9, '가진 것을 잃을까', 'e10'),
        month('2026년 9월', 17, '경계와 문턱', 'e9'),
      ],
      '2026-10-20',
      new Set()
    );
    expect(rows).toEqual([
      {
        key: '2026년 10월',
        monthKey: '2026-10',
        month: '10월',
        count: 9,
        quote: '가진 것을 잃을까',
        entryId: 'e10',
        excerpt: 'none',
      },
      {
        key: '2026년 9월',
        monthKey: '2026-09',
        month: '9월',
        count: 17,
        quote: '경계와 문턱',
        entryId: 'e9',
        excerpt: 'unmade',
      },
    ]);
  });
  it('사이에 빈 달은 쉬어 간 달로 남기고, 첫 기록 이전의 빈 달은 뺀다', () => {
    const rows = monthRows(
      [
        month('2026년 10월', 2, 'a', 'e1'),
        month('2026년 9월', 0),
        month('2026년 8월', 1, 'b', 'e2'),
        month('2026년 7월', 0),
        month('2026년 6월', 0),
      ],
      '2026-10-20'
    );
    expect(rows.map((r) => [r.month, r.count])).toEqual([
      ['10월', 2],
      ['9월', 0],
      ['8월', 1],
    ]);
  });
  it('생각만 남긴 달은 문장 없이 기록 수만', () => {
    const [row] = monthRows([month('2026년 10월', 3)], '2026-10-20');
    expect(row.quote).toBeNull();
    expect(row.entryId).toBeNull();
  });
  it('모두 비면 빈 목록', () => {
    expect(monthRows([month('2026년 10월', 0), month('2026년 9월', 0)], '2026-10-20')).toEqual([]);
  });
  it('미리보기 없는 옛 응답은 quotes만 쓴다', () => {
    const [row] = monthRows(
      [{ label: '2026년 10월', count: 1, books: [], quotes: ['옛 문장'] }],
      '2026-10-20'
    );
    expect(row.quote).toBe('옛 문장');
    expect(row.entryId).toBeNull();
  });
});

describe('monthRows — 달의 발췌집 상태', () => {
  const today = '2026-04-03';
  const rows = (made: ReadonlySet<string> | null | undefined) =>
    monthRows(
      [
        month('2026년 4월', 5, '진행 중', 'e4'),
        month('2026년 3월', 38, '엮은 달', 'e3'),
        month('2026년 2월', 12, '안 엮은 달', 'e2'),
        month('2026년 1월', 4),
        month('2025년 12월', 0),
        month('2025년 11월', 1, '더 오래된 달', 'e11'),
      ],
      today,
      made
    );
  const states = (made: ReadonlySet<string> | null | undefined) =>
    Object.fromEntries(rows(made).map((r) => [r.monthKey, r.excerpt]));

  it('끝난 달에 문장이 있고 엮지 않았으면 unmade, 엮었으면 made', () => {
    expect(states(new Set(['2026-03']))).toMatchObject({
      '2026-03': 'made',
      '2026-02': 'unmade',
      '2025-11': 'unmade',
    });
  });
  it('진행 중인 달은 문장이 있어도 none', () => {
    expect(states(new Set())['2026-04']).toBe('none');
  });
  it('문장 없이 생각만 남긴 달과 쉬어 간 달은 none', () => {
    expect(states(new Set())).toMatchObject({ '2026-01': 'none', '2025-12': 'none' });
  });
  it('엮은 달 조회 결과를 모르면(null·undefined) 어떤 달에도 행동을 두지 않는다', () => {
    for (const made of [null, undefined]) {
      expect(Object.values(states(made)).every((v) => v === 'none')).toBe(true);
    }
  });
  it('withExcerptState는 이미 만든 줄에 나중에 도착한 조회 결과를 입힌다', () => {
    const base = rows(null);
    const next = withExcerptState(base, today, new Set(['2026-03']));
    expect(next.find((r) => r.monthKey === '2026-03')?.excerpt).toBe('made');
    expect(base.find((r) => r.monthKey === '2026-03')?.excerpt).toBe('none');
  });
});
