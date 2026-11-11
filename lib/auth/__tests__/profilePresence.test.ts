import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

beforeEach(() => {
  vi.resetModules();
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
});

const active = (id: string) => ({ data: { id, account_deletions: null }, error: null });

describe('server-only profile routing cache', () => {
  it('reuses an active lookup for at most 60 seconds', async () => {
    const { profileState } = await import('../profilePresence');
    const lookup = vi.fn().mockResolvedValue(active('a'));
    expect(await profileState('a', lookup)).toBe('active');
    await profileState('a', lookup);
    expect(lookup).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(60_000);
    await profileState('a', lookup);
    expect(lookup).toHaveBeenCalledTimes(2);
  });
  it('never shares existence between accounts or caches missing profiles', async () => {
    const { profileState } = await import('../profilePresence');
    await profileState('a', async () => active('a'));
    const lookup = vi
      .fn()
      .mockResolvedValueOnce({ data: null, error: null })
      .mockResolvedValueOnce(active('b'));
    expect(await profileState('b', lookup)).toBe('missing');
    expect(await profileState('b', lookup)).toBe('active');
    expect(lookup).toHaveBeenCalledTimes(2);
  });
  it('onboarding forces a source read and invalidates a deleted profile', async () => {
    const { profileState } = await import('../profilePresence');
    const lookup = vi
      .fn()
      .mockResolvedValueOnce(active('a'))
      .mockResolvedValue({ data: null, error: null });
    await profileState('a', lookup);
    expect(await profileState('a', lookup, true)).toBe('missing');
    expect(await profileState('a', lookup)).toBe('missing');
    expect(lookup).toHaveBeenCalledTimes(3);
  });
  it('DB errors propagate instead of sending users to onboarding or entering the cache', async () => {
    const { profileState } = await import('../profilePresence');
    const lookup = vi.fn().mockResolvedValue({ data: null, error: { code: 'timeout' } });
    await expect(profileState('a', lookup)).rejects.toThrow('Profile lookup failed');
    await expect(profileState('a', lookup)).rejects.toThrow('Profile lookup failed');
    expect(lookup).toHaveBeenCalledTimes(2);
  });
});

describe('account deletion state', () => {
  it.each([null, undefined, [], {}])('an empty embed (%j) means active', async (embed) => {
    const { profileState } = await import('../profilePresence');
    const lookup = vi.fn().mockResolvedValue({ data: { id: 'a', account_deletions: embed } });
    expect(await profileState('a', lookup)).toBe('active');
  });
  it.each([[[{ purge_after: '2026-11-26T00:00:00Z' }]], [{ purge_after: '2026-11-26T00:00:00Z' }]])(
    'a deletion row (%j) means pending',
    async (embed) => {
      const { profileState } = await import('../profilePresence');
      const lookup = vi.fn().mockResolvedValue({ data: { id: 'a', account_deletions: embed } });
      expect(await profileState('a', lookup)).toBe('pending');
    }
  );
  it('never caches pending, so a restore takes effect on the next request', async () => {
    const { profileState } = await import('../profilePresence');
    const lookup = vi
      .fn()
      .mockResolvedValueOnce({
        data: { id: 'a', account_deletions: [{ purge_after: '2026-11-26T00:00:00Z' }] },
        error: null,
      })
      .mockResolvedValue(active('a'));
    expect(await profileState('a', lookup)).toBe('pending');
    expect(await profileState('a', lookup)).toBe('active');
    expect(lookup).toHaveBeenCalledTimes(2);
  });
  it('forgetProfileState drops a cached active state', async () => {
    const { profileState, forgetProfileState } = await import('../profilePresence');
    const lookup = vi.fn().mockResolvedValue(active('a'));
    await profileState('a', lookup);
    forgetProfileState('a');
    await profileState('a', lookup);
    expect(lookup).toHaveBeenCalledTimes(2);
  });
});

describe('degrading before the deletion migration lands', () => {
  it('falls back to a plain profile read when the embed errors, and does not cache it', async () => {
    const { profileState } = await import('../profilePresence');
    const lookup = vi.fn().mockResolvedValue({ data: null, error: { code: 'PGRST200' } });
    const fallback = vi.fn().mockResolvedValue({ data: { id: 'a' }, error: null });
    expect(await profileState('a', lookup, false, fallback)).toBe('active');
    expect(await profileState('a', lookup, false, fallback)).toBe('active');
    expect(lookup).toHaveBeenCalledTimes(2);
    expect(fallback).toHaveBeenCalledTimes(2);
  });
  it('the fallback still reports a missing profile as missing', async () => {
    const { profileState } = await import('../profilePresence');
    const lookup = vi.fn().mockResolvedValue({ data: null, error: { code: 'PGRST200' } });
    const fallback = vi.fn().mockResolvedValue({ data: null, error: null });
    expect(await profileState('a', lookup, false, fallback)).toBe('missing');
  });
  it('throws when the fallback also fails', async () => {
    const { profileState } = await import('../profilePresence');
    const lookup = vi.fn().mockResolvedValue({ data: null, error: { code: 'PGRST200' } });
    const fallback = vi.fn().mockResolvedValue({ data: null, error: { code: 'timeout' } });
    await expect(profileState('a', lookup, false, fallback)).rejects.toThrow(
      'Profile lookup failed'
    );
  });
});
