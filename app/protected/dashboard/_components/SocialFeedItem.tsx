import { SocialFeedEntry } from '@/types/entry';
import Image from 'next/image';
import Link from 'next/link';

export default function FeedItem({ entry, profile }: SocialFeedEntry) {
  return (
    <div className="flex items-start gap-3 py-3 border-b">
      <Image
        src={profile.profile_image ?? '/default-profile.png'}
        alt={`${profile.nickname}님의 프로필`}
        width={40}
        height={40}
        className="rounded-full object-cover"
      />
      <div className="flex-1 text-sm leading-5">
        <div>
          <Link
            href={`/protected/social/${profile.nickname}-${profile.tag}`}
            className="font-medium hover:underline"
          >
            {profile.nickname}
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
