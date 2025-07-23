import SocialFeedItem from './SocialFeedItem';
import { SocialFeedEntry } from '@/types/entry';

interface Props {
  feed: SocialFeedEntry[];
}

export default async function SocialFeed({ feed }: Props) {
  return (
    <section className="mt-6">
      <h2 className="text-section-title text-label dark:text-white mb-4"> 👥 소셜 피드</h2>
      <div className="space-y-3">
        {feed.length === 0 ? (
          <div className="text-sm text-muted-foreground">친구들의 활동이 아직 없어요.</div>
        ) : (
          feed.map((item) => <SocialFeedItem key={item.entry.id} {...item} />)
        )}
      </div>
    </section>
  );
}
