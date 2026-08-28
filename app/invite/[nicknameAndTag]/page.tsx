import { notFound, redirect } from 'next/navigation';
import { parseInviteSlug } from '@/lib/social/invite';
import { createSupabaseServerClient } from '@/lib/supabase/server';

type Props = { params: Promise<{ nicknameAndTag: string }> };

export default async function InvitePage({ params }: Props) {
  const { nicknameAndTag } = await params;
  if (!parseInviteSlug(nicknameAndTag)) notFound();

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?redirect=${encodeURIComponent(`/invite/${nicknameAndTag}`)}`);
  }
  redirect(`/protected/social?invite=${encodeURIComponent(nicknameAndTag)}`);
}
