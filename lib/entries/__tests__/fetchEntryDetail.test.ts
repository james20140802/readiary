import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { fetchEntryDetail } from '../fetchEntryDetail';

vi.mock('@/lib/supabase/server', () => ({ createSupabaseServerClient: vi.fn() }));
vi.mock('@/lib/supabase/getServerUser', () => ({
  getServerUser: async () => ({ data: { user: { id: 'me' } }, error: null }),
}));

const entryResult = vi.fn();
const pickResult = vi.fn();

function from(table: string) {
  const chain: Record<string, unknown> = {};
  chain.select = () => chain;
  chain.eq = () => chain;
  chain.single = async () => entryResult();
  chain.maybeSingle = async () =>
    table === 'monthly_sentence_picks' ? pickResult() : entryResult();
  return chain;
}

const entry = (over: Record<string, unknown> = {}) => ({
  data: {
    id: 'e1',
    note: null,
    quote: '문장',
    from_page: null,
    to_page: null,
    date: '2026-09-14',
    created_at: '2026-09-14T01:00:00Z',
    user_book_id: 'ub1',
    is_private: false,
    user_books: { book_id: 'b1', user_id: 'me', books: { id: 'b1', title: '책' } },
    likes: [],
    comments: [{ count: 0 }],
    ...over,
  },
  error: null,
});

beforeEach(() => {
  entryResult.mockReset().mockResolvedValue(entry());
  pickResult.mockReset().mockResolvedValue({ data: null, error: null });
  vi.mocked(createSupabaseServerClient).mockResolvedValue({ from } as never);
});

describe('fetchEntryDetail — 이달의 문장', () => {
  it('고르지 않았으면 false', async () => {
    expect((await fetchEntryDetail('e1'))?.isMonthlySentence).toBe(false);
  });

  it('그 기록의 달로 고른 선택이 있으면 true', async () => {
    pickResult.mockResolvedValue({ data: { month: '2026-09-01' }, error: null });
    expect((await fetchEntryDetail('e1'))?.isMonthlySentence).toBe(true);
  });

  it('기록 날짜가 다른 달로 옮겨진 선택은 무효다', async () => {
    pickResult.mockResolvedValue({ data: { month: '2026-08-01' }, error: null });
    expect((await fetchEntryDetail('e1'))?.isMonthlySentence).toBe(false);
  });

  it('문장이 지워진 기록의 선택은 무효다', async () => {
    entryResult.mockResolvedValue(entry({ quote: '  ', note: '생각' }));
    pickResult.mockResolvedValue({ data: { month: '2026-09-01' }, error: null });
    expect((await fetchEntryDetail('e1'))?.isMonthlySentence).toBe(false);
  });

  it('선택을 읽지 못해도 기록은 보이고 false다', async () => {
    pickResult.mockResolvedValue({ data: null, error: { code: 'XX000' } });
    const detail = await fetchEntryDetail('e1');
    expect(detail?.entry.id).toBe('e1');
    expect(detail?.isMonthlySentence).toBe(false);
  });
});
