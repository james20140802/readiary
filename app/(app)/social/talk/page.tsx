// app/(app)/social/talk/page.tsx — 토론 목록. 진행 중과 정리된 토론의 첫 쪽을 함께 그린다.
import DebateList from '@/components/debate/DebateList';
import { mapListItem } from '@/lib/debate/map';
import { PAGE_SIZE } from '@/lib/debate/server';
import { fetchFriendList } from '@/lib/friends/fetchFriendList';
import { getServerUser } from '@/lib/supabase/getServerUser';
import { createSupabaseServerClient } from '@/lib/supabase/server';

async function firstPage(closed: boolean) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc('list_debates', {
    p_closed: closed,
    p_before: null,
    p_limit: PAGE_SIZE,
  });
  if (error || !data) {
    if (error) console.error('Debate list failed:', error.code);
    return { items: [], nextBefore: null };
  }
  const raw = data as { items: unknown[]; next_before: string | null };
  return { items: raw.items.map(mapListItem), nextBefore: raw.next_before };
}

export default async function DebateListPage() {
  const {
    data: { user },
  } = await getServerUser();
  if (!user) return null;
  const [open, closed, friends] = await Promise.all([
    firstPage(false),
    firstPage(true),
    fetchFriendList(),
  ]);
  return (
    <DebateList initialOpen={open} initialClosed={closed} friendCount={friends?.length ?? 0} />
  );
}
