import SocialFeedItem from './SocialFeedItem';
import { SocialFeedEntry } from '@/types/entry';

interface Props {
  feed: SocialFeedEntry[];
}

export default async function SocialFeed({ feed }: Props) {
  if (feed.length === 0) {
    return <div className="text-sm text-muted-foreground">친구들의 활동이 아직 없어요.</div>;
  }

  return (
    <div className="mt-4 space-y-3">
      {feed.map((item) => (
        <SocialFeedItem key={item.entry.id} {...item} />
      ))}
    </div>
  );
}
