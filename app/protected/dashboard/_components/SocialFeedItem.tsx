import { SocialFeedEntry } from '@/types/entry';
import Link from 'next/link';

export default function FeedItem({ entry, profile }: SocialFeedEntry) {
  return (
    <div className="flex gap-3 py-4 border-b items-center">
      <div className="w-11 h-11 rounded-full bg-muted flex items-center justify-center text-sm font-semibold text-white">
        {profile.nickname?.charAt(0).toUpperCase() ?? '?'}
      </div>
      <div className="flex-1 text-sm leading-5 bg-muted/30 px-3 py-2 rounded-md">
        <div className="mb-1">
          <Link
            href={`/protected/social/${profile.nickname}-${profile.tag}`}
            className="font-medium hover:underline"
          >
            {profile.name}
          </Link>
          <span className="text-muted-foreground ml-1">님이</span>
        </div>
        <div>
          📘 <span className="font-semibold">{entry.book.title}</span>{' '}
          {entry.to_page ? `${entry.to_page}쪽까지` : '기록'} 읽었어요
        </div>
        <div className="text-xs text-muted-foreground mt-1">{entry.date}</div>
      </div>
    </div>
  );
}
