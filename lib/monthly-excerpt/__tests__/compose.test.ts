import { describe, expect, it } from 'vitest';
import { movePick, reconcilePicks, reorderPick, togglePick, type ExcerptPick } from '../compose';

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
