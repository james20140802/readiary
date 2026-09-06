import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { fetchRecallEntry } from '../fetchRecallEntry';

vi.mock('@/lib/dates', () => ({ todayKST: () => '2026-08-27' }));
vi.mock('@/lib/supabase/server', () => ({ createSupabaseServerClient: vi.fn() }));
const rpc = vi.fn();
beforeEach(() => {
  rpc.mockReset();
  vi.mocked(createSupabaseServerClient).mockResolvedValue({ rpc } as never);
});

// Selection parity and RLS are tested against PostgreSQL in performance_contract.sql.
describe('fetchRecallEntry RPC boundary', () => {
  it('returns one selected candidate without fetching the source rows', async () => {
    const entry = {
      id: 'e1',
      date: '2025-08-27',
      quote: 'Q',
      bookTitle: 'B',
      bookAuthor: null,
      yearsAgo: 1,
    };
    rpc.mockResolvedValue({ data: entry, error: null });
    expect(await fetchRecallEntry()).toEqual(entry);
    expect(rpc).toHaveBeenCalledExactlyOnceWith('get_recall_entry', { p_today: '2026-08-27' });
  });
  it('hides the card when no eligible candidate exists', async () => {
    rpc.mockResolvedValue({ data: null, error: null });
    expect(await fetchRecallEntry()).toBeNull();
  });
  it('does not display partial data on RPC or authentication failure', async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    rpc.mockResolvedValue({ data: { id: 'partial' }, error: { code: '42501' } });
    expect(await fetchRecallEntry()).toBeNull();
    log.mockRestore();
  });
});
