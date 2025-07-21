'use client';

import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Entry } from '@/types/entry';
import { Book } from '@/types/book';
import { Profile } from '@/types/profile';
import Link from 'next/link';

interface Props {
  entry: Entry;
  book: Book;
  profile: Profile;
}

export default function FriendEntryDetailContent({ entry, book, profile }: Props) {
  const router = useRouter();

  return (
    <div className="space-y-6">
      <Link
        href={`/protected/social/${profile.nickname + '-' + profile.tag}`}
        className="flex items-center gap-4 mb-4 hover:opacity-80 transition"
      >
        {profile.profile_image ? (
          <Image
            src={profile.profile_image}
            alt="프로필 이미지"
            width={48}
            height={48}
            className="rounded-full object-cover"
          />
        ) : (
          <div className="w-12 h-12 rounded-full bg-gray-300 flex items-center justify-center text-sm font-bold text-white">
            {profile.nickname[0]}
          </div>
        )}
        <div>
          <div className="text-sm font-medium text-gray-900 dark:text-white">{profile.name}</div>
          <div className="text-xs text-gray-500 dark:text-gray-400">
            {profile.nickname}#{profile.tag}
          </div>
        </div>
      </Link>
      {/* 책 요약 정보 */}
      <div
        className="flex items-center gap-4 cursor-pointer hover:opacity-80 transition"
        onClick={() =>
          router.push(`/protected/social/${profile.nickname + '-' + profile.tag}/books/${book.id}`)
        }
      >
        <Image
          src={book.cover_url ?? '/images/default-book-cover.png'}
          alt="Book cover"
          width={48}
          height={72}
          className="rounded shadow object-cover"
        />
        <div className="space-y-1">
          <h2 className="text-xl font-semibold">{book.title ?? '제목 없음'}</h2>
          <p className="text-sm text-gray-500">{book.author ?? '저자 미상'}</p>
        </div>
      </div>

      {/* 독서 기록 박스 */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-md space-y-4">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">✍️ 오늘의 독서 기록</h1>
        <p className="text-base text-gray-800 dark:text-gray-100 whitespace-pre-wrap">
          {entry.summary ?? '요약이 없습니다'}
        </p>
        <hr className="border-t border-gray-200 dark:border-gray-700" />
        <p className="text-sm text-gray-500">
          📅 {entry.date ? new Date(entry.date).toLocaleDateString() : ''} | 📖{' '}
          {entry.from_page ?? ''}~{entry.to_page ?? ''}쪽
        </p>
      </div>
    </div>
  );
}
