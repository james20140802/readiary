import { timingSafeEqual } from 'node:crypto';
import type { SupabaseClient } from '@supabase/supabase-js';
import { accountAdmin } from '@/lib/account/admin';

export const runtime = 'nodejs';
export const maxDuration = 60;

const BUCKET = 'profiles';
const PAGE = 100;

function reply(data: unknown, status = 200) {
  return Response.json(data, { status, headers: { 'Cache-Control': 'no-store' } });
}

/** 폴더 아래 모든 파일 경로를 모은다. 지우면서 훑으면 오프셋이 밀리므로 먼저 전부 모은다. */
async function collectPaths(db: SupabaseClient, prefix: string, out: string[]): Promise<boolean> {
  for (let offset = 0; ; offset += PAGE) {
    const { data, error } = await db.storage.from(BUCKET).list(prefix, { limit: PAGE, offset });
    if (error) return false;
    for (const entry of data ?? []) {
      // id가 없으면 하위 폴더다.
      if (entry.id) out.push(`${prefix}/${entry.name}`);
      else if (!(await collectPaths(db, `${prefix}/${entry.name}`, out))) return false;
    }
    if ((data?.length ?? 0) < PAGE) return true;
  }
}

async function removeFiles(db: SupabaseClient, uid: string): Promise<boolean> {
  const paths: string[] = [];
  if (!(await collectPaths(db, uid, paths))) return false;
  for (let i = 0; i < paths.length; i += PAGE) {
    const { error } = await db.storage.from(BUCKET).remove(paths.slice(i, i + PAGE));
    if (error) return false;
  }
  return true;
}

type Outcome = 'purged' | 'failed' | 'skipped';

async function purgeUser(db: SupabaseClient, uid: string): Promise<Outcome> {
  if (!(await removeFiles(db, uid))) return 'failed';
  // claim의 행 잠금은 RPC 호출을 넘어 유지되지 않는다. 그 사이 복구됐다면 지우지 않는다.
  const { data: still, error: checkError } = await db
    .from('account_deletions')
    .select('user_id')
    .eq('user_id', uid)
    .lte('purge_after', new Date().toISOString())
    .maybeSingle();
  if (checkError) return 'failed';
  if (!still) return 'skipped';
  const { error: deleteError } = await db.auth.admin.deleteUser(uid);
  // 일부만 처리된 뒤 재시도하면 이미 없는 사용자일 수 있다. 그때는 삭제된 것으로 본다.
  const err = deleteError as { status?: number; code?: string } | null;
  const gone = err?.status === 404 || err?.code === 'user_not_found';
  if (deleteError && !gone) return 'failed';
  const { error: recordError } = await db.rpc('record_account_purge', { p_user: uid });
  return recordError ? 'failed' : 'purged';
}

export async function GET(request: Request) {
  const expected = Buffer.from(process.env.CRON_SECRET ? `Bearer ${process.env.CRON_SECRET}` : '');
  const actual = Buffer.from(request.headers.get('authorization') ?? '');
  if (!expected.length || actual.length !== expected.length || !timingSafeEqual(actual, expected))
    return reply({ error: 'Unauthorized' }, 401);

  const db = accountAdmin();
  let purged = 0;
  let failed = 0;

  const { data: due, error: claimError } = await db.rpc('claim_due_account_deletions', {
    p_limit: 5,
  });
  if (claimError) failed += 1;
  for (const uid of (due ?? []) as string[]) {
    let outcome: Outcome;
    try {
      outcome = await purgeUser(db, uid);
    } catch {
      outcome = 'failed';
    }
    if (outcome === 'purged') purged += 1;
    else if (outcome === 'failed') failed += 1;
  }

  // 정리는 삭제 결과와 무관하게 실행한다.
  const { data: prunedCount, error: pruneError } = await db.rpc('prune_account_purges');
  if (pruneError) failed += 1;
  const pruned = typeof prunedCount === 'number' ? prunedCount : 0;

  return reply({ purged, failed, pruned }, failed > 0 ? 500 : 200);
}
