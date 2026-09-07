import { pushClient, reply, sameOrigin } from '@/lib/push/server';
export async function POST(request: Request) {
  if (!sameOrigin(request)) return reply({ error: 'Forbidden' }, 403);
  const db = await pushClient();
  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user) return reply({ error: 'Unauthorized' }, 401);
  const b = await request.json().catch(() => null);
  if (
    !b ||
    !['friends', 'weekly', 'recall', 'inbox'].includes(b.kind) ||
    (b.id !== undefined && !/^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(b.id))
  )
    return reply({ error: 'Invalid request' }, 400);
  const { error } = await db.rpc('mark_push_seen', {
    p_kind: b.kind,
    ...(b.id ? { p_delivery: b.id } : {}),
  });
  return error ? reply({ error: 'Failed' }, 500) : reply({ ok: true });
}
