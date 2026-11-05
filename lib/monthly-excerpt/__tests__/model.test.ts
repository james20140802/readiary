import { describe, expect, it } from 'vitest';
import type { ExcerptItem } from '../types';
import type { ExcerptPick } from '../compose';
import {
  bookTally,
  bookTallyForDisplay,
  coverItem,
  shareImpact,
  shelfExcerptLine,
  titlePageSentence,
} from '../model';

let seq = 0;
const item = (bookId: string, title: string, extra: Partial<ExcerptItem> = {}): ExcerptItem => ({
  position: ++seq,
  entryId: `e${seq}`,
  date: '2026-03-01',
  quote: '문장',
  note: null,
  isPrivate: false,
  fromPage: null,
  toPage: null,
  book: { id: bookId, title, author: null },
  ...extra,
});
const many = (bookId: string, title: string, n: number) =>
  Array.from({ length: n }, () => item(bookId, title));

const fourBooksTwelve = [
  ...many('1', '가', 5),
  ...many('2', '나', 4),
  ...many('3', '다', 2),
  ...many('4', '라', 1),
];
const oneBookOne = [item('1', '가')];

describe('titlePageSentence', () => {
  it('우리말 셈으로 쓴다', () => {
    expect(titlePageSentence(fourBooksTwelve)).toBe('네 권의 책에서 문장 열두 개를 골랐습니다.');
    expect(titlePageSentence(oneBookOne)).toBe('한 권의 책에서 문장 한 개를 골랐습니다.');
  });
  it('주인 이름이 있으면 앞에 붙인다', () => {
    expect(titlePageSentence(fourBooksTwelve, '민지')).toBe(
      '민지가 네 권의 책에서 문장 열두 개를 골랐습니다.'
    );
  });
  it('100부터는 숫자 그대로', () => {
    expect(titlePageSentence(many('1', '가', 120))).toBe('한 권의 책에서 문장 120개를 골랐습니다.');
  });
});

describe('bookTally', () => {
  it('많은 순, 같으면 먼저 나온 순', () => {
    const items = [item('1', '가'), item('2', '나'), item('2', '나'), item('3', '다')];
    expect(bookTally(items)).toEqual([
      { title: '나', count: 2 },
      { title: '가', count: 1 },
      { title: '다', count: 1 },
    ]);
  });
  it('bookTallyForDisplay는 넘치는 책을 외 N권으로 묶는다', () => {
    const items = [
      ...many('1', '가', 5),
      ...many('2', '나', 4),
      ...many('3', '다', 2),
      ...many('4', '라', 1),
    ];
    expect(bookTallyForDisplay(items, 2)).toEqual([
      { title: '가', count: 5 },
      { title: '나', count: 4 },
      { title: '외 2권', count: 3 },
    ]);
    expect(bookTallyForDisplay(items.slice(0, 9), 2)).toHaveLength(2);
  });
});

const p = (entryId: string, extra: Partial<ExcerptPick> = {}): ExcerptPick => ({
  entryId,
  quote: 'q',
  date: '2026-03-01',
  bookTitle: '책',
  isPrivate: false,
  hasNote: false,
  ...extra,
});

describe('shareImpact', () => {
  it('공개 항목의 생각 수와 비공개 수를 안내한다', () => {
    const picks = [
      p('1', { hasNote: true }),
      p('2', { hasNote: true }),
      p('3', { hasNote: true }),
      p('4'),
      p('5', { isPrivate: true, hasNote: true }),
      p('6', { isPrivate: true }),
    ];
    const r = shareImpact(picks);
    expect(r.lines).toEqual(['생각 3개도 함께 보여요', '문장 2개는 친구에게 보이지 않아요']);
    expect(r).toMatchObject({ privateCount: 2, noteCount: 3, publicCount: 4 });
  });
  it('모두 공개이고 생각이 없으면 안내가 없다', () => {
    expect(shareImpact([p('1'), p('2')]).lines).toEqual([]);
  });
});

describe('coverItem', () => {
  const privateItem = item('1', '가', { isPrivate: true });
  const publicItem = item('1', '가');
  it('주인은 첫 항목, 친구는 첫 공개 항목', () => {
    expect(coverItem([privateItem, publicItem], 'friend')).toBe(publicItem);
    expect(coverItem([privateItem, publicItem], 'owner')).toBe(privateItem);
  });
  it('isPrivate가 없으면 공개로 본다', () => {
    const noFlag = { ...publicItem, isPrivate: undefined };
    expect(coverItem([noFlag], 'friend')).toBe(noFlag);
  });
  it('보일 항목이 없으면 null', () => {
    expect(coverItem([privateItem], 'friend')).toBeNull();
    expect(coverItem([], 'owner')).toBeNull();
  });
});

describe('shelfExcerptLine — 책장의 한 줄', () => {
  it('엮은 권수와 엮을 달이 있는지를 해 목록에서 센다', () => {
    expect(
      shelfExcerptLine([
        { year: 2026, excerptCount: 2, hasUnmade: false },
        { year: 2025, excerptCount: 9, hasUnmade: false },
      ])
    ).toEqual({ count: 11, hasUnmade: false });
  });
  it('엮은 것이 없고 엮을 달도 없으면 줄을 두지 않는다', () => {
    expect(shelfExcerptLine([])).toBeNull();
    expect(shelfExcerptLine([{ year: 2026, excerptCount: 0, hasUnmade: false }])).toBeNull();
  });
  it('엮은 것이 없어도 엮을 달이 있으면 줄을 둔다', () => {
    expect(shelfExcerptLine([{ year: 2026, excerptCount: 0, hasUnmade: true }])).toEqual({
      count: 0,
      hasUnmade: true,
    });
  });
});
