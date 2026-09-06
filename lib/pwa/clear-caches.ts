/**
 * 기기에 남은 PWA 캐시(Cache Storage) 정리.
 * 서비스 워커 캐시는 로그아웃해도 저절로 비워지지 않는다 — 공용 기기에서 로그인한 뒤 본 화면이 남지 않도록
 * 로그아웃 자리에서 직접 지운다. 브라우저가 Cache Storage 를 막았거나(비공개 창 등) 실패해도 로그아웃은 막지 않는다.
 */

function cacheStorage(): CacheStorage | null {
  return typeof caches === 'undefined' ? null : caches;
}

/** 로그아웃 — 이 기기의 캐시를 모두 비운다 */
export async function clearPwaCaches(): Promise<void> {
  const storage = cacheStorage();
  if (!storage) return;
  try {
    const keys = await storage.keys();
    await Promise.all(keys.map((key) => storage.delete(key)));
  } catch {
    // 캐시를 못 지워도 로그아웃은 이어 간다
  }
}

/**
 * 개인정보가 담긴 응답을 캐시하던 next-pwa 기본 규칙의 캐시 이름 — 규칙을 NetworkOnly 로 바꾼 뒤엔 아무도 비우지 않는다.
 * 'others' 는 문서 전체를 NetworkOnly 로 돌리기 전까지 /terms 같은 공개 화면의 개인화된 HTML 을 담았다.
 */
export const LEGACY_PRIVATE_CACHE_NAMES = [
  'others',
  'apis',
  'cross-origin',
  'next-data',
  'next-image',
];

// v2: 문서 전체를 NetworkOnly 로 돌리면서 'others' 에 남은 공개 화면 HTML 을 한 번 더 지운다
const SWEEP_FLAG = 'readiary.pwa.private-cache-swept.v2';

/**
 * 규칙을 바꾸기 전에 설치된 기기에 남은 옛 캐시를 한 번 지운다.
 * NetworkOnly 규칙은 옛 캐시를 읽지도 만료시키지도 않아 그대로 남기 때문. 기기당 한 번이면 되므로 localStorage 표식을 둔다
 * (표식을 못 쓰는 환경이면 매번 지운다 — 비용은 삭제 호출 몇 번뿐이다).
 */
export async function sweepLegacyPrivateCaches(): Promise<void> {
  const storage = cacheStorage();
  if (!storage) return;
  if (readFlag()) return;
  try {
    await Promise.all(LEGACY_PRIVATE_CACHE_NAMES.map((name) => storage.delete(name)));
    writeFlag();
  } catch {
    // 다음 방문 때 다시 시도한다
  }
}

function readFlag(): boolean {
  try {
    return typeof localStorage !== 'undefined' && localStorage.getItem(SWEEP_FLAG) === '1';
  } catch {
    return false;
  }
}

function writeFlag(): void {
  try {
    localStorage.setItem(SWEEP_FLAG, '1');
  } catch {
    // 표식을 못 남기면 다음에 또 지운다
  }
}
