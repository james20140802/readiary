// app/(app)/social/talk/[id]/page.tsx — 토론 한 편. 볼 수 없거나 없으면 404.
import { notFound } from 'next/navigation';
import DebateView from '@/components/debate/DebateView';
import { mapDebate } from '@/lib/debate/map';
import { isUuid } from '@/lib/share/validation';
import { getServerUser } from '@/lib/supabase/getServerUser';
import { createSupabaseServerClient } from '@/lib/supabase/server';

interface Props {
  params: Promise<{ id: string }>;
}

export default async function DebatePage({ params }: Props) {
  const { id } = await params;
  if (!isUuid(id)) notFound();
  const {
    data: { user },
  } = await getServerUser();
  if (!user) return null;
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc('get_debate', { p_id: id.toLowerCase() });
  if (error || !data) {
    if (error && error.message !== 'not_found') console.error('Debate page failed:', error.code);
    notFound();
  }
  return <DebateView initial={mapDebate(data)} />;
}
