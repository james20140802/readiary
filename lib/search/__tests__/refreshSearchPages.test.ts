import { describe, expect, it, vi } from 'vitest';
import { refreshSearchPages } from '../refreshSearchPages';

const cursor = { id: 'new-boundary', created: '2026-09-18' };
describe('restored search refresh', () => {
  it('replaces edited and deleted rows using fresh cursors through the expanded depth', async () => {
    const fetchPage = vi
      .fn()
      .mockResolvedValueOnce({ items: ['edited', 'remaining'], next: cursor })
      .mockResolvedValueOnce({ items: ['new-third'], next: null });
    const result = await refreshSearchPages(fetchPage, 4, new AbortController().signal);
    expect(result).toEqual({ items: ['edited', 'remaining', 'new-third'], next: null });
    expect(fetchPage.mock.calls).toEqual([[null], [cursor]]);
  });
  it('does not load beyond the previously expanded depth', async () => {
    const fetchPage = vi.fn().mockResolvedValue({ items: ['a', 'b'], next: cursor });
    expect(await refreshSearchPages(fetchPage, 2, new AbortController().signal)).toEqual({
      items: ['a', 'b'],
      next: cursor,
    });
    expect(fetchPage).toHaveBeenCalledTimes(1);
  });
  it('refreshes an empty cache and accepts deletion of every match', async () => {
    const fetchPage = vi.fn().mockResolvedValue({ items: [], next: null });
    expect(await refreshSearchPages(fetchPage, 20, new AbortController().signal)).toEqual({
      items: [],
      next: null,
    });
    await refreshSearchPages(fetchPage, 0, new AbortController().signal);
    expect(fetchPage).toHaveBeenCalledTimes(2);
  });
  it('rejects partial refresh failures instead of publishing an incomplete list', async () => {
    const fetchPage = vi
      .fn()
      .mockResolvedValueOnce({ items: ['a'], next: cursor })
      .mockRejectedValueOnce(new Error('offline'));
    await expect(refreshSearchPages(fetchPage, 3, new AbortController().signal)).rejects.toThrow(
      'offline'
    );
  });
  it('stops an obsolete refresh before requesting another page', async () => {
    const controller = new AbortController();
    const fetchPage = vi.fn().mockImplementation(async () => {
      controller.abort();
      return { items: ['a'], next: cursor };
    });
    await expect(refreshSearchPages(fetchPage, 3, controller.signal)).rejects.toThrow();
    expect(fetchPage).toHaveBeenCalledTimes(1);
  });
});
