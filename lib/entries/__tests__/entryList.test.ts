import { describe, it, expect } from 'vitest';
import { patchEntryInList, removeEntryFromList } from '../entryList';
import { EntryDetailData } from '@/types/entry';

const book = { id: 'b1', title: 'T', author: 'A', cover_url: null, isbn: null, total_pages: 100 };

function make(id: string, over: Partial<EntryDetailData['entry']> = {}): EntryDetailData {
  return {
    entry: {
      id,
      date: '2026-09-01',
      quote: `q-${id}`,
      note: null,
      from_page: 1,
      to_page: 2,
      is_private: false,
      book,
      created_at: '2026-09-01T00:00:00Z',
      ...over,
    },
    userId: 'u1',
    initialLiked: false,
    initialLikeCount: 3,
    initialCommentCount: 1,
  };
}

describe('patchEntryInList', () => {
  it('고친 필드만 바꾸고 좋아요·댓글 수 같은 나머지는 그대로 둔다', () => {
    const list = [make('a'), make('b')];
    const next = patchEntryInList(list, 'b', {
      quote: null,
      note: '생각',
      from_page: 10,
      to_page: 12,
      date: '2026-08-30',
      is_private: true,
    });
    expect(next[0]).toBe(list[0]);
    expect(next[1].entry).toMatchObject({
      id: 'b',
      quote: null,
      note: '생각',
      from_page: 10,
      to_page: 12,
      date: '2026-08-30',
      is_private: true,
      book,
      created_at: '2026-09-01T00:00:00Z',
    });
    expect(next[1].initialLikeCount).toBe(3);
    expect(next[1].initialCommentCount).toBe(1);
  });

  it('없는 id면 원본을 그대로 돌려준다', () => {
    const list = [make('a')];
    expect(
      patchEntryInList(list, 'zzz', {
        quote: 'x',
        note: null,
        from_page: null,
        to_page: null,
        date: '2026-09-01',
        is_private: false,
      })
    ).toEqual(list);
  });

  it('null 목록은 null', () => {
    expect(
      patchEntryInList(null, 'a', {
        quote: 'x',
        note: null,
        from_page: null,
        to_page: null,
        date: '2026-09-01',
        is_private: false,
      })
    ).toBeNull();
  });
});

describe('removeEntryFromList', () => {
  it('해당 id만 뺀다', () => {
    const list = [make('a'), make('b'), make('c')];
    expect(removeEntryFromList(list, 'b').map((e) => e.entry.id)).toEqual(['a', 'c']);
  });

  it('null 목록은 null', () => {
    expect(removeEntryFromList(null, 'a')).toBeNull();
  });
});
