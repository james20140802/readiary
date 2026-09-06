import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

beforeEach(() => {
  vi.resetModules();
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
});

describe('server-only profile routing cache', () => {
  it('reuses a positive lookup for at most 60 seconds', async () => {
    const { hasProfile } = await import('../profilePresence');
    const lookup = vi.fn().mockResolvedValue({ data: { id: 'a' }, error: null });
    expect(await hasProfile('a', lookup)).toBe(true);
    await hasProfile('a', lookup);
    expect(lookup).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(60_000);
    await hasProfile('a', lookup);
    expect(lookup).toHaveBeenCalledTimes(2);
  });
  it('never shares existence between accounts or caches missing profiles', async () => {
    const { hasProfile } = await import('../profilePresence');
    await hasProfile('a', async () => ({ data: { id: 'a' }, error: null }));
    const lookup = vi
      .fn()
      .mockResolvedValueOnce({ data: null, error: null })
      .mockResolvedValueOnce({ data: { id: 'b' }, error: null });
    expect(await hasProfile('b', lookup)).toBe(false);
    expect(await hasProfile('b', lookup)).toBe(true);
    expect(lookup).toHaveBeenCalledTimes(2);
  });
  it('onboarding forces a source read and invalidates a deleted profile', async () => {
    const { hasProfile } = await import('../profilePresence');
    const lookup = vi
      .fn()
      .mockResolvedValueOnce({ data: { id: 'a' }, error: null })
      .mockResolvedValue({ data: null, error: null });
    await hasProfile('a', lookup);
    expect(await hasProfile('a', lookup, true)).toBe(false);
    expect(await hasProfile('a', lookup)).toBe(false);
    expect(lookup).toHaveBeenCalledTimes(3);
  });
  it('DB errors propagate instead of sending users to onboarding or entering the cache', async () => {
    const { hasProfile } = await import('../profilePresence');
    const lookup = vi.fn().mockResolvedValue({ data: null, error: { code: 'timeout' } });
    await expect(hasProfile('a', lookup)).rejects.toThrow('Profile lookup failed');
    await expect(hasProfile('a', lookup)).rejects.toThrow('Profile lookup failed');
    expect(lookup).toHaveBeenCalledTimes(2);
  });
});
