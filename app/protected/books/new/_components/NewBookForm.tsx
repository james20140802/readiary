'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import FormGroup from '@/components/ui/FormGroup';
import FormLabel from '@/components/ui/FormLabel';

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
    <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl mx-auto">
      <FormGroup>
        <FormLabel>책 제목</FormLabel>
        <Input
          type="text"
          placeholder="책 제목"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
        />
      </FormGroup>

      <FormGroup>
        <FormLabel>저자</FormLabel>
        <Input
          type="text"
          placeholder="저자"
          value={author}
          onChange={(e) => setAuthor(e.target.value)}
          required
        />
      </FormGroup>

      <FormGroup>
        <FormLabel>총 페이지 수</FormLabel>
        <Input
          type="number"
          placeholder="총 페이지 수"
          value={totalPages}
          onChange={(e) => setTotalPages(e.target.value)}
          required
        />
      </FormGroup>

      {error && <p className="text-red-500 text-sm">{error}</p>}

      <div className="flex justify-end">
        <Button type="submit" disabled={loading}>
          {loading ? '등록 중...' : '책 등록하기'}
        </Button>
      </div>
    </form>
  );
}
