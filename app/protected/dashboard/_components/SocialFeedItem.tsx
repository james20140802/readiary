import { SocialFeedEntry } from '@/types/entry';
import Link from 'next/link';

import { Avatar } from '@/components/ui/Avatar';
import Card from '@/components/ui/Card';
import { formatDistance } from 'date-fns';
import { ko } from 'date-fns/locale';
import { toZonedTime } from 'date-fns-tz';

export default function FeedItem({ entry, profile }: SocialFeedEntry) {
  const timeZone = 'Asia/Seoul'; // 또는 Intl.DateTimeFormat().resolvedOptions().timeZone
  const now = toZonedTime(new Date(), timeZone); // 현재 시간을 특정 시간대로 고정
  const targetDate = toZonedTime(new Date(entry.created_at), timeZone);

  return (
    <Card aria-label="소셜 피드 항목" className="flex gap-3 py-4 items-center">
      <Avatar
        alt={`${profile.nickname}의 프로필 이미지`}
        fallbackText={profile.nickname.charAt(0).toUpperCase()}
        src={profile.profile_image || undefined}
      />
      <div className="flex-1 text-sm leading-5 bg-muted/30 px-3 py-2 rounded-md">
        <div className="mb-1">
          <Link
            href={`/protected/social/u/${profile.nickname}-${profile.tag}`}
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
        <div className="text-xs text-muted-foreground mt-1">
          {formatDistance(targetDate, now, { addSuffix: true, locale: ko })}
        </div>
      </div>
    </Card>
  );
}
