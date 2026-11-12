// This is a routing hint, never an authorization cache. Auth is checked every request;
// all reads/writes still pass RLS. No browser-supplied cookie or metadata is trusted.
const TTL_MS = 60_000;
const MAX_ENTRIES = 1000;
const activeUntil = new Map<string, number>();

/** missing: 프로필이 아직 없다(온보딩 전) · active: 쓰는 중 · pending: 탈퇴 유예 중 */
export type ProfileState = 'missing' | 'active' | 'pending';

type ProfileRow = { id: string; account_deletions?: unknown } | null;

/** 일대일 FK 임베드는 PostgREST가 객체로도 배열로도 줄 수 있다 — 행이 하나라도 있으면 유예 중이다 */
function hasDeletionRow(embed: unknown): boolean {
  if (Array.isArray(embed)) return embed.length > 0;
  if (embed && typeof embed === 'object') {
    return (embed as { purge_after?: unknown }).purge_after != null;
  }
  return false;
}

type Lookup = () => PromiseLike<{ data: ProfileRow; error?: unknown }>;

/**
 * `profiles.select('id, account_deletions(purge_after)')` 결과로 이 사람이 갈 곳을 정한다.
 * 임베드가 실패하면(탈퇴 마이그레이션이 아직 없는 DB 등) `fallbackLookup`(`select('id')`)으로
 * 한 번 더 읽어 프로필이 있으면 'active'로 본다 — 이 대체 결과는 캐시하지 않는다.
 */
export async function profileState(
  userId: string,
  lookup: Lookup,
  forceRefresh = false,
  fallbackLookup?: Lookup
): Promise<ProfileState> {
  if (!forceRefresh && (activeUntil.get(userId) ?? 0) > Date.now()) return 'active';
  activeUntil.delete(userId);
  const { data, error } = await lookup();
  if (error) {
    if (!fallbackLookup) throw new Error('Profile lookup failed');
    const fallback = await fallbackLookup();
    if (fallback.error) throw new Error('Profile lookup failed');
    return fallback.data ? 'active' : 'missing';
  }
  // 없음·유예 중은 캐시하지 않는다: 온보딩을 마치거나 복구하면 바로 다음 요청부터 맞아야 한다
  if (!data) return 'missing';
  if (hasDeletionRow(data.account_deletions)) return 'pending';
  if (activeUntil.size >= MAX_ENTRIES) {
    const oldest = activeUntil.keys().next().value;
    if (oldest !== undefined) activeUntil.delete(oldest);
  }
  activeUntil.set(userId, Date.now() + TTL_MS);
  return 'active';
}

/** 탈퇴 신청·복구 직후 이 서버 인스턴스의 캐시를 지운다 */
export function forgetProfileState(userId: string): void {
  activeUntil.delete(userId);
}
