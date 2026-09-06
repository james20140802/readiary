import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  LEGACY_PRIVATE_CACHE_NAMES,
  clearPwaCaches,
  sweepLegacyPrivateCaches,
} from '@/lib/pwa/clear-caches';

function fakeCacheStorage(names: string[]) {
  const store = new Set(names);
  return {
    store,
    keys: vi.fn(async () => [...store]),
    delete: vi.fn(async (name: string) => store.delete(name)),
  };
}

function fakeLocalStorage() {
  const map = new Map<string, string>();
  return {
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => void map.set(k, v),
  };
}

describe('clearPwaCaches', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('Cache Storage 의 캐시를 모두 지운다', async () => {
    const storage = fakeCacheStorage(['others', 'apis', 'static-js-assets']);
    vi.stubGlobal('caches', storage);
    await clearPwaCaches();
    expect(storage.store.size).toBe(0);
  });

  it('Cache Storage 가 없거나 실패해도 던지지 않는다', async () => {
    await expect(clearPwaCaches()).resolves.toBeUndefined();
    vi.stubGlobal('caches', {
      keys: vi.fn(async () => {
        throw new Error('blocked');
      }),
    });
    await expect(clearPwaCaches()).resolves.toBeUndefined();
  });
});

describe('sweepLegacyPrivateCaches', () => {
  beforeEach(() => vi.stubGlobal('localStorage', fakeLocalStorage()));
  afterEach(() => vi.unstubAllGlobals());

  it('옛 규칙이 남긴 비공개 캐시만 지우고 정적 자원 캐시는 둔다', async () => {
    const storage = fakeCacheStorage([...LEGACY_PRIVATE_CACHE_NAMES, 'static-js-assets']);
    vi.stubGlobal('caches', storage);
    await sweepLegacyPrivateCaches();
    expect([...storage.store]).toEqual(['static-js-assets']);
  });

  it('기기당 한 번만 지운다', async () => {
    const storage = fakeCacheStorage(['others']);
    vi.stubGlobal('caches', storage);
    await sweepLegacyPrivateCaches();
    await sweepLegacyPrivateCaches();
    expect(storage.delete).toHaveBeenCalledTimes(LEGACY_PRIVATE_CACHE_NAMES.length);
  });

  it('localStorage 를 못 쓰면 표식 없이 매번 지운다', async () => {
    vi.stubGlobal('localStorage', {
      getItem: () => {
        throw new Error('denied');
      },
      setItem: () => {
        throw new Error('denied');
      },
    });
    const storage = fakeCacheStorage(['others']);
    vi.stubGlobal('caches', storage);
    await sweepLegacyPrivateCaches();
    await sweepLegacyPrivateCaches();
    expect(storage.delete).toHaveBeenCalledTimes(LEGACY_PRIVATE_CACHE_NAMES.length * 2);
  });
});
