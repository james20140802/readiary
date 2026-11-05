import { describe, expect, it } from 'vitest';
import {
  itemsFromPicks,
  movePick,
  pickFromCandidate,
  pickFromItem,
  reconcilePicks,
  reorderPick,
  togglePick,
  type ExcerptPick,
} from '../compose';
import type { Candidate } from '../types';

const pick = (entryId: string): ExcerptPick => ({
  entryId,
  quote: `문장 ${entryId}`,
  date: '2026-03-01',
  bookTitle: '책',
  isPrivate: false,
  hasNote: false,
});
const [a, b, c] = [pick('a'), pick('b'), pick('c')];

describe('togglePick', () => {
  it('없으면 끝에 더하고 있으면 뺀다', () => {
    expect(togglePick([a], b)).toEqual([a, b]);
    expect(togglePick([a, b], a)).toEqual([b]);
  });
  it('원본을 바꾸지 않는다', () => {
    const src = [a];
    togglePick(src, b);
    expect(src).toEqual([a]);
  });
});

describe('movePick', () => {
  it('끝에서 더 나아가면 그대로', () => {
    expect(movePick([a, b, c], 'a', -1)).toEqual([a, b, c]);
    expect(movePick([a, b, c], 'c', 1)).toEqual([a, b, c]);
  });
  it('한 칸 옮긴다', () => {
    expect(movePick([a, b, c], 'a', 1)).toEqual([b, a, c]);
    expect(movePick([a, b, c], 'c', -1)).toEqual([a, c, b]);
  });
  it('없는 id는 그대로', () => {
    expect(movePick([a, b], 'x', 1)).toEqual([a, b]);
  });
});

describe('reorderPick', () => {
  it('from을 to 자리로 옮긴다', () => {
    expect(reorderPick([a, b, c], 0, 2)).toEqual([b, c, a]);
    expect(reorderPick([a, b, c], 2, 0)).toEqual([c, a, b]);
  });
  it('범위 밖이면 그대로', () => {
    expect(reorderPick([a, b], -1, 1)).toEqual([a, b]);
    expect(reorderPick([a, b], 0, 5)).toEqual([a, b]);
  });
});

describe('reconcilePicks', () => {
  it('사라진 기록을 빼고 순서를 유지한다', () => {
    expect(reconcilePicks([a, b, c], ['b'])).toEqual([a, c]);
    expect(reconcilePicks([a, b, c], [])).toEqual([a, b, c]);
  });
});

const candidate: Candidate = {
  entryId: 'e1',
  date: '2026-03-02',
  quote: '끝은 대개 처음에 이미 적혀 있다.',
  note: '생각',
  hasNote: true,
  isPrivate: true,
  fromPage: 8,
  toPage: null,
  userBookId: 'ub1',
  bookId: 'b1',
  bookTitle: '책',
  author: '저자',
};

describe('후보와 항목 사이의 변환', () => {
  it('후보를 고른 문장으로, 고른 문장을 읽는 화면의 항목으로 바꾼다', () => {
    const picks = [pickFromCandidate(candidate)];
    expect(itemsFromPicks(picks)).toEqual([
      {
        position: 0,
        entryId: 'e1',
        date: '2026-03-02',
        quote: '끝은 대개 처음에 이미 적혀 있다.',
        note: '생각',
        isPrivate: true,
        fromPage: 8,
        toPage: null,
        book: { id: 'b1', title: '책', author: '저자' },
      },
    ]);
  });
  it('옛 후보 응답(생각 본문·책 정보 없음)도 읽는다', () => {
    const old = { ...candidate } as Partial<Candidate>;
    delete old.note;
    delete old.bookId;
    delete old.author;
    const pick = pickFromCandidate(old as Candidate);
    expect(pick).toMatchObject({ note: null, bookId: 'ub1', author: null, hasNote: true });
  });
  it('엮은 항목에서 시작한 고른 문장은 되돌려도 같은 항목이다', () => {
    const item = itemsFromPicks([pickFromCandidate(candidate)])[0];
    expect(itemsFromPicks([pickFromItem(item)])).toEqual([item]);
    expect(pickFromItem({ ...item, isPrivate: undefined, note: null })).toMatchObject({
      isPrivate: false,
      hasNote: false,
    });
  });
  it('순서 번호는 고른 순서다', () => {
    const items = itemsFromPicks([
      { ...pickFromCandidate(candidate), entryId: 'x' },
      { ...pickFromCandidate(candidate), entryId: 'y' },
    ]);
    expect(items.map((i) => [i.entryId, i.position])).toEqual([
      ['x', 0],
      ['y', 1],
    ]);
  });
});
