'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Button from '@/components/ui/Button';

/** 직접 입력 — 기록 폼과 같은 종이 문법. 입력은 박스 없이 괘선 위에. */
export default function NewBookForm() {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [totalPages, setTotalPages] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (totalPages.trim() !== '' && (isNaN(Number(totalPages)) || Number(totalPages) <= 0)) {
      setError('페이지 수는 1 이상의 숫자여야 합니다.');
      return;
    }

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
          total_pages: totalPages.trim() === '' ? null : Number(totalPages),
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || '책 등록에 실패했습니다.');
      }

      router.push('/protected/books');
      router.refresh();
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

  const fieldClass =
    'mt-1.5 block w-full border-b border-hairline bg-transparent py-1.5 text-ink transition-colors placeholder:text-ink-faint focus:border-hairline-strong focus:outline-none';

  return (
    <form onSubmit={handleSubmit}>
      <div className="space-y-6">
        <div>
          <label htmlFor="new-book-title" className="text-[11.5px] font-medium text-ink-faint">
            제목
          </label>
          <input
            id="new-book-title"
            type="text"
            placeholder="책 제목"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            className={`${fieldClass} font-serif text-[17px]`}
          />
        </div>

        <div>
          <label htmlFor="new-book-author" className="text-[11.5px] font-medium text-ink-faint">
            저자
          </label>
          <input
            id="new-book-author"
            type="text"
            placeholder="지은이"
            value={author}
            onChange={(e) => setAuthor(e.target.value)}
            required
            className={`${fieldClass} font-serif text-[15px]`}
          />
        </div>

        <div>
          <label htmlFor="new-book-pages" className="text-[11.5px] font-medium text-ink-faint">
            총 쪽수 <span className="font-normal">(선택)</span>
          </label>
          <div className="mt-1.5 flex items-center gap-1 text-[13px] tabular-nums text-ink-sub">
            <span className="text-ink-faint">총</span>
            <input
              id="new-book-pages"
              type="number"
              inputMode="numeric"
              min={1}
              placeholder="?"
              value={totalPages}
              onChange={(e) => setTotalPages(e.target.value)}
              className="w-14 border-b border-hairline bg-transparent py-1 text-center text-ink transition-colors placeholder:text-ink-faint focus:border-hairline-strong focus:outline-none"
            />
            <span className="text-ink-faint">쪽</span>
          </div>
        </div>
      </div>

      <div className="mt-8 flex items-center justify-between gap-4 border-t border-hairline pt-4">
        {error ? (
          <p className="text-caption font-medium text-danger">{error}</p>
        ) : (
          <span className="text-[11.5px] text-ink-faint">쪽수는 나중에 채워도 됩니다.</span>
        )}
        <Button type="submit" size="sm" disabled={loading}>
          {loading ? '꽂는 중...' : '책장에 꽂기'}
        </Button>
      </div>
    </form>
  );
}
