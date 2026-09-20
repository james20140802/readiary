import { beforeEach, describe, expect, it, vi } from 'vitest';
import { updateEntry, UncertainMutationError } from '../updateEntry';
const mocks = vi.hoisted(() => ({ fetch: vi.fn(), single: vi.fn(), rpc: vi.fn() }));
vi.mock('@/lib/api/fetch', () => ({
  apiFetch: mocks.fetch,
  SessionExpiredError: class extends Error {},
}));
vi.mock('@/lib/supabase/client', () => ({
  createSupabaseClient: () => ({
    rpc: mocks.rpc,
    from: () => ({ select: () => ({ eq: () => ({ single: mocks.single }) }) }),
  }),
}));
const values = {
  quote: '문장',
  note: null,
  from_page: null,
  to_page: 10,
  date: '2026-09-20',
  is_private: true,
};
describe('entry update response reconciliation', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.rpc.mockResolvedValue({ error: null });
  });
  it('does not read back normal success', async () => {
    mocks.fetch.mockResolvedValue(new Response('{}'));
    expect(await updateEntry('id', values)).toBeNull();
    expect(mocks.single).not.toHaveBeenCalled();
  });
  it('keeps validation rejection editable', async () => {
    mocks.fetch.mockResolvedValue(Response.json({ error: '잘못된 입력' }, { status: 400 }));
    expect(await updateEntry('id', values)).toBe('잘못된 입력');
    expect(mocks.single).not.toHaveBeenCalled();
  });
  it('recognizes committed PATCH after lost response including normalized pages', async () => {
    mocks.fetch.mockRejectedValue(new Error('network'));
    mocks.single.mockResolvedValue({
      data: { ...values, from_page: 10, user_books: { book_id: 'book', user_id: 'me' } },
      error: null,
    });
    expect(await updateEntry('id', values)).toBeNull();
    expect(mocks.rpc).toHaveBeenCalledWith('update_user_book_progress', {
      p_book_id: 'book',
      p_user_id: 'me',
    });
  });
  it('keeps a committed edit uncertain when progress repair fails', async () => {
    mocks.fetch.mockResolvedValue(new Response('', { status: 500 }));
    mocks.single.mockResolvedValue({
      data: { ...values, from_page: 10, user_books: { book_id: 'book', user_id: 'me' } },
      error: null,
    });
    mocks.rpc.mockResolvedValue({ error: new Error('progress unavailable') });
    await expect(updateEntry('id', values)).rejects.toBeInstanceOf(UncertainMutationError);
    expect(mocks.fetch).toHaveBeenCalledTimes(1);
  });
  it('does not allow blind resubmit when current values differ or readback fails', async () => {
    mocks.fetch.mockRejectedValue(new Error('network'));
    mocks.single.mockResolvedValue({ data: { ...values, quote: 'old' }, error: null });
    await expect(updateEntry('id', values)).rejects.toBeInstanceOf(UncertainMutationError);
    mocks.single.mockRejectedValue(new Error('offline'));
    await expect(updateEntry('id', values)).rejects.toBeInstanceOf(UncertainMutationError);
  });
});
