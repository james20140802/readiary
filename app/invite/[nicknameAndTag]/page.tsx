import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import InviteView from '@/components/tools/InviteView';
import { parseInviteSlug } from '@/lib/social/invite';
import { createSupabaseServerClient } from '@/lib/supabase/server';

type Props = { params: Promise<{ nicknameAndTag: string }> };

export const metadata: Metadata = {
  title: '함께 읽자는 초대 | Readiary',
  robots: { index: false, follow: false },
};

export default async function InvitePage({ params }: Props) {
  const { nicknameAndTag } = await params;
  const parsed = parseInviteSlug(nicknameAndTag);
  if (!parsed) notFound();

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // 로그인했으면 예전처럼 곧장 친구 신청으로. 아니면 누가 초대했는지 보여 주고 가입·로그인을 고르게 한다
  if (user) redirect(`/social?invite=${encodeURIComponent(nicknameAndTag)}`);

  return (
    <InviteView
      nickname={parsed.nickname}
      tag={parsed.tag}
      invitePath={`/invite/${nicknameAndTag}`}
    />
  );
}
