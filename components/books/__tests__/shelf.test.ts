import { describe, expect, it } from 'vitest';
import { arrangeShelf, lastTouched, splitShelf } from '../shelfSort';
import { spineColor, spineHeightPercent, spineWidthPx, SPINE_COLORS } from '../shelfStyle';
import {
  addedThoughtLabel,
  daysBetween,
  laterLabel,
  lastRecordedLabel,
  monthDay,
  pageLabel,
  shortDate,
} from '../bookFormat';

const book = (id: string, title: string, created: string, finished = false) => ({
  id,
  created_at: created,
  is_finished: finished,
  books: { title },
});

const BOOKS = [
  book('a', '소유냐 존재냐', '2026-09-01T00:00:00Z'),
  book('b', '리만 가설', '2026-09-20T00:00:00Z'),
  book('c', '데미안', '2026-08-01T00:00:00Z', true),
];
const STATS = {
  a: { firstDate: '2026-09-29', lastDate: '2026-10-06', entryCount: 11 },
  c: { firstDate: '2026-08-02', lastDate: '2026-08-30', entryCount: 16 },
};

describe('arrangeShelf', () => {
  it('최근 읽은 순은 마지막 기록 날, 기록이 없으면 등록한 날', () => {
    expect(arrangeShelf(BOOKS, 'recent', 'all', STATS).map((b) => b.id)).toEqual(['a', 'b', 'c']);
    expect(lastTouched(BOOKS[1], STATS)).toBe('2026-09-20');
  });
  it('통계를 모르면(친구 책장) 등록한 날 순', () => {
    expect(arrangeShelf(BOOKS, 'recent', 'all', null).map((b) => b.id)).toEqual(['b', 'a', 'c']);
  });
  it('제목순은 가나다', () => {
    expect(arrangeShelf(BOOKS, 'title', 'all', STATS).map((b) => b.id)).toEqual(['c', 'b', 'a']);
  });
  it('문장 많은 순', () => {
    expect(arrangeShelf(BOOKS, 'entries', 'all', STATS).map((b) => b.id)).toEqual(['c', 'a', 'b']);
  });
  it('읽는 중만 / 다 읽은 책만', () => {
    expect(arrangeShelf(BOOKS, 'recent', 'reading', STATS).map((b) => b.id)).toEqual(['a', 'b']);
    expect(arrangeShelf(BOOKS, 'recent', 'finished', STATS).map((b) => b.id)).toEqual(['c']);
  });
  it('원래 목록을 바꾸지 않는다', () => {
    const copy = [...BOOKS];
    arrangeShelf(BOOKS, 'title', 'all', STATS);
    expect(BOOKS).toEqual(copy);
  });
});

describe('splitShelf', () => {
  it('읽는 중과 다 읽은 책으로 나눈다', () => {
    const { reading, finished } = splitShelf(BOOKS, STATS);
    expect(reading.map((b) => b.id)).toEqual(['a', 'b']);
    expect(finished.map((b) => b.id)).toEqual(['c']);
  });
});

describe('책등 모양', () => {
  it('같은 제목은 늘 같은 색·키·두께', () => {
    expect(spineColor('월든')).toBe(spineColor('월든'));
    expect(spineHeightPercent('월든')).toBe(spineHeightPercent('월든'));
    expect(spineWidthPx('월든', null)).toBe(spineWidthPx('월든', null));
    expect(SPINE_COLORS).toContain(spineColor('작별하지 않는다'));
  });
  it('키는 선반의 80~98%', () => {
    for (const t of ['a', '소년이 온다', '나미야 잡화점의 기적', '']) {
      const h = spineHeightPercent(t);
      expect(h).toBeGreaterThanOrEqual(80);
      expect(h).toBeLessThanOrEqual(98);
    }
  });
  it('두꺼운 책은 두껍고, 데스크톱은 1.25배', () => {
    expect(spineWidthPx('변신', 100)).toBeLessThan(spineWidthPx('변신', 600));
    expect(spineWidthPx('변신', 400, 1.25)).toBe(Math.round(34 * 1.25));
    expect(spineWidthPx('변신', null)).toBeGreaterThanOrEqual(24);
    expect(spineWidthPx('변신', null)).toBeLessThanOrEqual(40);
  });
});

describe('표기', () => {
  it('날짜', () => {
    expect(shortDate('2026-10-06')).toBe('10.6');
    expect(monthDay('2026-09-29')).toBe('9월 29일');
    expect(daysBetween('2026-09-29', '2026-10-06')).toBe(7);
  });
  it('쪽', () => {
    expect(pageLabel(184, null)).toBe('p.184');
    expect(pageLabel(12, 20)).toBe('p.12–20');
    expect(pageLabel(12, 12)).toBe('p.12');
    expect(pageLabel(null, null)).toBeNull();
  });
  it('덧붙인 생각까지의 날', () => {
    expect(laterLabel(4)).toBe('나흘 뒤에');
    expect(laterLabel(7)).toBe('일주일 뒤에');
    expect(laterLabel(2)).toBe('이틀 뒤에');
    expect(laterLabel(40)).toBe('1달 뒤에');
    // 서울 10월 6일 새벽 = UTC 10월 5일
    expect(addedThoughtLabel('2026-10-02', '2026-10-05T16:30:00Z')).toBe('나흘 뒤에 덧붙인 생각');
    expect(addedThoughtLabel('2026-10-02', '2026-10-02T01:00:00Z')).toBe('그날 덧붙인 생각');
  });
  it('마지막으로 남긴 날', () => {
    expect(lastRecordedLabel('2026-10-23', '2026-10-23')).toBe('오늘 남김');
    expect(lastRecordedLabel('2026-10-22', '2026-10-23')).toBe('어제 남김');
    expect(lastRecordedLabel('2026-10-20', '2026-10-23')).toBe('3일 전');
    expect(lastRecordedLabel('2026-09-21', '2026-10-23')).toBe('9월 21일');
  });
});
