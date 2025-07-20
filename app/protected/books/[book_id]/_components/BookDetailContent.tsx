'use client';

import { useState } from 'react';
import MarkAsFinishedButton from './MarkAsFinishedButton';
import EntryCard from '@/components/EntryCard';
import { MyBook } from '@/types/book';
import { Entry } from '@/types/entry';
import Image from 'next/image';

interface Props {
  userBook: MyBook;
  entries: Entry[] | null;
  userId: string;
}

export default function BookDetailContent({ userBook, entries, userId }: Props) {
  const [isFinished, setIsFinished] = useState(userBook.is_finished);

  return (
    <div className="space-y-6">
      {/* Book info and progress */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:gap-6">
        <div className="flex-shrink-0 self-center sm:self-start">
          <Image
            src={userBook.books.cover_url ?? '/images/default-book-cover.png'}
            alt="Book cover"
            width={128}
            height={192}
            className="rounded shadow object-cover w-full sm:w-auto"
          />
        </div>
        <div className="flex-1 space-y-2">
          <h1 className="text-3xl font-bold">{userBook.books.title}</h1>
          <p className="text-sm text-gray-500">{userBook.books.author}</p>

          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded h-2">
            <div
              className="bg-green-500 h-2 rounded"
              style={{
                width: `${userBook.progress ?? 0}%`,
              }}
            />
          </div>
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>
              {userBook.last_read_page ?? 0} / {userBook.books.total_pages} 페이지
            </span>
            <span>{userBook.progress ?? 0}%</span>
          </div>
          {!isFinished ? (
            <MarkAsFinishedButton
              userBookId={userBook.id}
              progress={userBook.progress ?? 0}
              onFinish={() => setIsFinished(true)}
              userId={userId}
            />
          ) : (
            <div className="text-sm mt-2 text-green-600 font-medium rounded">
              ✅ 책 읽기를 완료했어요!
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">📓 독서 기록</h2>
        <a
          href={`/protected/books/${userBook.book_id}/entry/new`}
          className="inline-block bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 text-sm"
        >
          ➕ 기록 추가하기
        </a>
      </div>

      {entries && entries.length > 0 ? (
        <ul className="space-y-4">
          {entries.map((entry) => (
            <li key={entry.id}>
              <EntryCard id={entry.id} summary={entry.summary ?? ''} date={entry.date} />
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-gray-500">아직 작성된 기록이 없습니다.</p>
      )}
    </div>
  );
}
