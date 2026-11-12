import { redirect } from 'next/navigation';
import type { SupabaseClient } from '@supabase/supabase-js';
import RestoreAccount from '@/components/account/RestoreAccount';
import { ACCOUNT_RESTORE_PATH, HOME_PATH } from '@/lib/routes';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getServerUser } from '@/lib/supabase/getServerUser';

/** 탈퇴 유예 중인 독자의 복구 화면 — 본인 행의 삭제 예정 시각을 읽어 넘긴다 */
export default async function RestoreAccountPage() {
  const {
    data: { user },
  } = await getServerUser();
  if (!user) redirect(`/login?redirect=${encodeURIComponent(ACCOUNT_RESTORE_PATH)}`);

  // 생성된 DB 타입에 아직 없는 테이블이라 타입 없는 클라이언트로 읽는다
  const supabase = (await createSupabaseServerClient()) as unknown as SupabaseClient;
  const { data, error } = await supabase
    .from('account_deletions')
    .select('purge_after')
    .eq('user_id', user.id)
    .maybeSingle();
  // 읽지 못했으면 다시 시도할 수 있게 오류 화면으로 — 유예 중이 아닌 사람으로 보내면 proxy와 엇갈린다
  if (error) throw new Error('account deletion state unavailable');
  if (!data) redirect(HOME_PATH);

  const purgeAfter = String((data as { purge_after: string }).purge_after);
  // eslint-disable-next-line react-hooks/purity -- 요청마다 그리는 서버 화면이라 지금 시각으로 판정한다
  const expired = Date.parse(purgeAfter) <= Date.now();
  return <RestoreAccount purgeAfter={purgeAfter} expired={expired} />;
}
