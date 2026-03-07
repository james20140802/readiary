import { redirect } from 'next/navigation';
import { fetchDetailSocialFeedEntries } from '@/lib/queries/fetchSocialFeedEntries';
import { FEED_PAGINATION_LIMIT } from '@/constants/social';
import DetailSocailFeedList from './_components/DetailSocialFeedList';
import BackButton from '@/components/ui/BackButton';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export default async function SocialFeedPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const feed = await fetchDetailSocialFeedEntries(0, FEED_PAGINATION_LIMIT);

  if (!feed) return redirect('/protected/social');

  return (
    <div className="lex justify-center">
      <div className="w-full">
        {/* 피드 집중도를 위해 max-width를 조금 더 조여줍니다 */}
        <header className="flex items-center mb-6">
          <BackButton />
          <h1 className="text-page-title text-label dark:text-white ml-4" aria-label="소셜 피드">
            👥 소셜 피드
          </h1>
        </header>
        {feed.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 bg-surface dark:bg-dark-surface rounded-3xl border border-border-subtle dark:border-dark-border shadow-sm">
            <span className="text-4xl mb-4">📭</span>
            <p className="text-secondary">친구들의 활동이 아직 없어요.</p>
          </div>
        ) : (
          <DetailSocailFeedList initialFeed={feed} userId={user.id} />
        )}
      </div>
    </div>
  );
}
