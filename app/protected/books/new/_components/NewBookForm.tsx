'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function NewBookForm() {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [totalPages, setTotalPages] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/books/new', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title,
          author,
          total_pages: Number(totalPages),
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || '책 등록에 실패했습니다.');
      }

      router.push('/protected/books');
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('에러가 발생했습니다.');
      }
      return;
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <input
        type="text"
        placeholder="책 제목"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        className="w-full border p-2 rounded bg-white dark:bg-gray-800 dark:text-white"
        required
      />
      <input
        type="text"
        placeholder="저자"
        value={author}
        onChange={(e) => setAuthor(e.target.value)}
        className="w-full border p-2 rounded bg-white dark:bg-gray-800 dark:text-white"
        required
      />
      <input
        type="number"
        placeholder="총 페이지 수"
        value={totalPages}
        onChange={(e) => setTotalPages(e.target.value)}
        className="w-full border p-2 rounded bg-white dark:bg-gray-800 dark:text-white"
        required
      />
      {error && <p className="text-red-500 text-sm">{error}</p>}
      <button
        type="submit"
        disabled={loading}
        className="w-full bg-black text-white p-2 rounded hover:bg-gray-800 disabled:opacity-50"
      >
        {loading ? '등록 중...' : '책 등록하기'}
      </button>
    </form>
  );
}
