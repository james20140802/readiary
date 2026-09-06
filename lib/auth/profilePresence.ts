// This is a routing hint, never an authorization cache. Auth is checked every request;
// all reads/writes still pass RLS. No browser-supplied cookie or metadata is trusted.
const TTL_MS = 60_000;
const MAX_ENTRIES = 1000;
const presentUntil = new Map<string, number>();

export async function hasProfile(
  userId: string,
  lookup: () => PromiseLike<{ data: { id: string } | null; error: unknown }>,
  forceRefresh = false
): Promise<boolean> {
  if (!forceRefresh && (presentUntil.get(userId) ?? 0) > Date.now()) return true;
  presentUntil.delete(userId);
  const { data, error } = await lookup();
  if (error) throw new Error('Profile lookup failed');
  // Never cache negative/error results: newly completed onboarding must work immediately.
  if (!data) return false;
  if (presentUntil.size >= MAX_ENTRIES) {
    const oldest = presentUntil.keys().next().value;
    if (oldest !== undefined) presentUntil.delete(oldest);
  }
  presentUntil.set(userId, Date.now() + TTL_MS);
  return true;
}
