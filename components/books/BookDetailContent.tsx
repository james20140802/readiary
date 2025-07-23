'use client';

import { useState } from 'react';

import EntryCard from '@/components/EntryCard';
import { MyBook } from '@/types/book';
import { Entry } from '@/types/entry';
import Image from 'next/image';
import MarkAsFinishedButton from './MarkAsFinishedButton';
import { Profile } from '@/types/profile';

interface Props {
  userBook: MyBook;
  entries: Entry[] | null;
  userId?: string;
  isFriend?: boolean;
  friendProfile?: Profile;
}

export default function BookDetailContent({
  userBook,
  entries,
  userId,
  isFriend = false,
  friendProfile,
}: Props) {
  const [isFinished, setIsFinished] = useState(userBook.is_finished);
  const { books, progress, last_read_page, book_id, id } = userBook;
  const { title, author, total_pages, cover_url } = books;

  return (
    <div className="space-y-8">
      {/* Book Info Section */}
      <section className="flex flex-col sm:flex-row sm:items-start sm:gap-6">
        <div className="flex-shrink-0 self-center sm:self-start">
          <Image
            src={cover_url ?? '/images/default-book-cover.png'}
            alt="Book cover"
            width={128}
            height={192}
            className="rounded shadow object-cover w-full sm:w-auto"
          />
        </div>
        <div className="flex-1 space-y-3">
          <h1 className="text-3xl font-bold text-label dark:text-white">{title}</h1>
          <p className="text-sm text-secondary">{author}</p>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded h-2">
            <div className="bg-green-500 h-2 rounded" style={{ width: `${progress ?? 0}%` }} />
          </div>
          <div className="flex justify-between text-xs text-secondary">
            <span>
              {last_read_page ?? 0} / {total_pages} 페이지
            </span>
            <span>{progress ?? 0}%</span>
          </div>

          {!isFinished ? (
            !isFriend && (
              <MarkAsFinishedButton
                userBookId={id}
                progress={progress ?? 0}
                onFinish={() => setIsFinished(true)}
                userId={userId ?? ''}
              />
            )
          ) : (
            <p className="text-sm mt-2 text-green-600 font-medium">✅ 책 읽기를 완료했어요!</p>
          )}
        </div>
      </section>

      {/* Entry Section */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-section-title text-label dark:text-white">📓 독서 기록</h2>
          {!isFriend && (
            <a
              href={`/protected/books/${book_id}/entry/new`}
              className="inline-block bg-tint text-white px-4 py-2 rounded hover:bg-blue-600 text-sm"
            >
              ➕ 기록 추가하기
            </a>
          )}
        </div>

        {entries && entries.length > 0 ? (
          <ul className="space-y-4">
            {entries.map((entry) => (
              <li key={entry.id}>
                <EntryCard
                  id={entry.id}
                  summary={entry.summary ?? ''}
                  date={entry.date}
                  href={
                    isFriend && friendProfile
                      ? `/protected/social/${friendProfile.nickname + '-' + friendProfile.tag}/entry/${entry.id}`
                      : undefined
                  }
                />
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-secondary">아직 작성된 기록이 없습니다.</p>
        )}
      </section>
    </div>
  );
}
