import Image from 'next/image';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { ko } from 'date-fns/locale';
import { SocialFeedEntry } from '@/types/entry';

export default function DetailSocailFeedItem({ item }: { item: SocialFeedEntry }) {
  const { profile, entry } = item;
  const { book } = entry;

  // 읽은 페이지 계산
  const readRange =
    entry.from_page && entry.to_page
      ? `${entry.from_page}p → ${entry.to_page}p`
      : `${entry.to_page || entry.from_page}p까지`;

  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-3xl p-6 mb-5 shadow-[0_4px_20px_rgba(0,0,0,0,03)] dark:shadow-none">
      {/* 1. 헤더: 유저 정보 */}
      <div className="flex items-center justify-between mb-5">
        <Link
          href={`/protected/social/u/${profile.nickname}-${profile.tag}`}
          className="flex items-center gap-3 group"
        >
          <div className="relative w-11 h-11 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700">
            {profile.profile_image ? (
              <Image
                src={profile.profile_image}
                alt={profile.nickname}
                fill
                className="object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-zinc-400 font-bold">
                {profile.nickname[0]}
              </div>
            )}
          </div>
          <div>
            <div className="flex items-center gap-1">
              <span className="font-bold text-sm text-zinc-900 dark:text-zinc-100 group-hover:underline">
                {profile.nickname}
              </span>
              <span className="text-[10px] text-zinc-400 font-medium">#{profile.tag}</span>
            </div>
            <p className="text-[11px] text-zinc-500">
              {formatDistanceToNow(new Date(entry.date), { addSuffix: true, locale: ko })}
            </p>
          </div>
        </Link>
        <button className="text-zinc-400 hover:text-zinc-600">
          <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 12h.01M12 12h.01M19 12h.01M6 12a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0z"
            />
          </svg>
        </button>
      </div>

      {/* 2. 본문: 독서 기록 카드 */}
      <div className="flex gap-5 bg-zinc-50 dark:bg-zinc-800/50 rounded-2xl p-4 border border-zinc-100/50 dark:border-zinc-700/30">
        {/* 책 표지 */}
        <div className="relative w-20 h-28 shrink-0 shadow-lg rotate-[-2deg] transition-transform hover:rotate-0">
          <Image
            src={book.cover_url || '/images/default-book-cover.png'}
            alt={book.title}
            fill
            className="rounded-md object-cover"
          />
        </div>

        <div className="flex flex-col justify-center">
          <div className="mb-2">
            <h3 className="font-extrabold text-base text-zinc-900 dark:text-zinc-100 line-clamp-1">
              {book.title}
            </h3>
            <p className="text-xs text-zinc-500 line-clamp-1">{book.author}</p>
          </div>

          <div className="inline-flex items-center px-2.5 py-1 rounded-full bg-tint/10 text-tint text-[11px] font-bold w-fit">
            📖 {readRange}
          </div>
        </div>
      </div>

      {/* 3. 유저 코멘트 (summary) */}
      {entry.summary && (
        <div className="mt-5 px-1">
          <p className="text-[14px] leading-relaxed text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap">
            {entry.summary}
          </p>
        </div>
      )}

      {/* 4. 하단 액션 바 */}
      <div className="mt-6 pt-4 border-t border-zinc-50 dark:border-zinc-800 flex items-center gap-5">
        <button className="flex items-center gap-1.5 text-zinc-500 hover:text-rose-500 transition-colors">
          <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
            />
          </svg>
          <span className="text-xs font-medium">응원</span>
        </button>
        <button className="flex items-center gap-1.5 text-zinc-500 hover:text-tint transition-colors">
          <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
            />
          </svg>
          <span className="text-xs font-medium">댓글</span>
        </button>
      </div>
    </div>
  );
}
