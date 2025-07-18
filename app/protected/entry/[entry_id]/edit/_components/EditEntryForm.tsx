'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Book } from '@/types/book';

interface Props {
  entryId: string;
  book: Book;
  initialSummary: string;
  initialFromPage: number | null;
  initialToPage: number | null;
  initialIsPrivate: boolean;
  initialDate: string;
}

export default function EditEntryForm({
  entryId,
  book,
  initialSummary,
  initialFromPage,
  initialToPage,
  initialIsPrivate,
  initialDate,
}: Props) {
  const router = useRouter();

  const [summary, setSummary] = useState(initialSummary);
  const [fromPage, setFromPage] = useState(initialFromPage?.toString() ?? '');
  const [toPage, setToPage] = useState(initialToPage?.toString() ?? '');
  const [isPrivate, setIsPrivate] = useState(initialIsPrivate);
  const [error, setError] = useState('');
  const [date, setDate] = useState(initialDate ?? new Date().toISOString().split('T')[0]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const res = await fetch(`/api/entries/${entryId}/edit`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        summary,
        from_page: Number(fromPage),
        to_page: Number(toPage),
        is_private: isPrivate,
        date,
      }),
    });

    if (!res.ok) {
      setError('수정에 실패했어요. 다시 시도해주세요.');
    } else {
      router.push(`/protected/entry/${entryId}`);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl mx-auto">
      <h1 className="text-xl font-semibold">🌤️ 독서 기록 수정</h1>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Image
            src={book.cover_url ?? '/images/default-book-cover.png'}
            alt="Book cover"
            width={48}
            height={72}
            className="rounded shadow object-cover"
          />
          <div>
            <h2 className="text-xl font-semibold">{book.title ?? '제목 없음'}</h2>
            <p className="text-sm text-gray-500">{book.author ?? '저자 미상'}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <label htmlFor="isPrivate" className="text-sm text-gray-700 dark:text-gray-300">
            🔒 비공개로 저장
          </label>
          <input
            id="isPrivate"
            type="checkbox"
            checked={isPrivate}
            onChange={(e) => setIsPrivate(e.target.checked)}
            className="w-4 h-4"
          />
        </div>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row">
        <div className="flex-1">
          <label className="block text-sm mb-1">시작 페이지</label>
          <input
            type="number"
            placeholder="ex. 10"
            value={fromPage}
            onChange={(e) => setFromPage(e.target.value)}
            className="w-full p-2 rounded border dark:bg-gray-800 dark:text-white"
          />
        </div>
        <div className="flex-1">
          <label className="block text-sm mb-1">종료 페이지</label>
          <input
            type="number"
            placeholder="ex. 25"
            value={toPage}
            onChange={(e) => setToPage(e.target.value)}
            className="w-full p-2 rounded border dark:bg-gray-800 dark:text-white"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm mb-1">읽은 날짜</label>
        <input
          type="date"
          value={date}
          max={new Date().toISOString().split('T')[0]}
          className="w-full p-2 rounded border dark:bg-gray-800 dark:text-white"
          onChange={(e) => setDate(e.target.value)}
          placeholder="읽은 날짜"
        />
      </div>

      <div>
        <label className="block text-sm mb-1">줄거리 요약</label>
        <textarea
          value={summary}
          onChange={(e) => setSummary(e.target.value)}
          placeholder="오늘 읽은 내용을 간단히 정리해보세요..."
          className="w-full p-3 rounded border dark:bg-gray-800 dark:text-white"
          rows={5}
        />
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}

      <button
        type="submit"
        className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 text-sm"
      >
        ✅ 기록 수정하기
      </button>
    </form>
  );
}
