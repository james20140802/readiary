'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createSupabaseClient } from '@/lib/supabase/client';

export default function NewBookPage() {
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [totalPages, setTotalPages] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const router = useRouter();
  const supabase = createSupabaseClient();

  const handleSubmit = async () => {
    setError('');
    setLoading(true);

    const { data: sessionData } = await supabase.auth.getSession();
    const userId = sessionData?.session?.user.id;
    if (!userId) {
      setError('로그인이 필요합니다.');
      setLoading(false);
      return;
    }

    const { data: bookData, error: bookError } = await supabase
      .from('books')
      .insert({ title, author, total_pages: Number(totalPages) })
      .select()
      .single();

    if (bookError || !bookData) {
      setError('책 등록에 실패했습니다.');
      setLoading(false);
      return;
    }

    const { error: userBookError } = await supabase.from('user_books').insert({
      user_id: userId,
      book_id: bookData.id,
    });

    if (userBookError) {
      setError('책 연결에 실패했습니다.');
      setLoading(false);
      return;
    }

    router.push('/protected/books');
  };

  return (
    <div className="w-full max-w-xl mx-auto p-4">
      <h1 className="text-xl font-semibold text-center text-gray-900 dark:text-white mb-4">
        책 등록
      </h1>

      <div className="space-y-4">
        <input
          className="w-full border p-2 rounded bg-white dark:bg-gray-800 dark:text-white"
          placeholder="책 제목"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <input
          className="w-full border p-2 rounded bg-white dark:bg-gray-800 dark:text-white"
          placeholder="저자"
          value={author}
          onChange={(e) => setAuthor(e.target.value)}
        />
        <input
          type="number"
          className="w-full border p-2 rounded bg-white dark:bg-gray-800 dark:text-white"
          placeholder="총 페이지 수"
          value={totalPages}
          onChange={(e) => setTotalPages(e.target.value)}
        />
        {error && <p className="text-red-500 text-sm">{error}</p>}

        <button
          className="w-full bg-black text-white p-2 rounded hover:bg-gray-800"
          onClick={handleSubmit}
          disabled={loading}
        >
          {loading ? '등록 중...' : '책 등록하기'}
        </button>
      </div>
    </div>
  );
}
