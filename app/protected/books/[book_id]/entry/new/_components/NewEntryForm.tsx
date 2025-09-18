'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Book } from '@/types/book';
import Input from '@/components/ui/Input';
import { useBadgeAwarder } from '@/hooks/useBadgeAwarder';
import { toast } from 'sonner';

import Button from '@/components/ui/Button';
import FormLabel from '@/components/ui/FormLabel';
import FormGroup from '@/components/ui/FormGroup';
import { Textarea } from '@/components/ui/Textarea';
import AnimatedSection from '@/components/ui/AnimatedSection';

interface Props {
  userBookId: string;
  userId: string;
  book: Book;
  bookId: string;
}

export default function NewEntryForm({ userBookId, userId, book, bookId }: Props) {
  const router = useRouter();
  const [summary, setSummary] = useState('');
  const [fromPage, setFromPage] = useState('');
  const [toPage, setToPage] = useState('');
  const [error, setError] = useState('');
  // const [success, setSuccess] = useState(false);
  const [isPrivate, setIsPrivate] = useState(false);
  const awardBadges = useBadgeAwarder();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!summary || !fromPage || !toPage) {
      setError('모든 필드를 입력해주세요.');
      return;
    }

    const from = Number(fromPage);
    const to = Number(toPage);

    if (isNaN(from) || isNaN(to) || from > to) {
      setError('시작 페이지는 종료 페이지보다 작거나 같아야 합니다.');
      return;
    }

    const res = await fetch('/api/entries/new', {
      method: 'POST',
      body: JSON.stringify({
        summary,
        from_page: from,
        to_page: to,
        date: new Date().toISOString().split('T')[0],
        user_book_id: userBookId,
        is_private: isPrivate,
        book_id: bookId,
        user_id: userId,
      }),
      headers: { 'Content-Type': 'application/json' },
    });

    if (!res.ok) {
      setError('기록 저장 중 오류가 발생했습니다.');
    } else {
      // setSuccess(true);
      toast.success('기록이 성공적으로 저장되었습니다.');
      await awardBadges(userId);
      router.push(`/protected/books/${bookId}`);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <h1 className="text-page-title">📓 오늘의 독서 기록</h1>
      <AnimatedSection>
        <div className="flex items-center justify-between">
          <p className="text-label dark:text-white">
            <strong className="text-lg">{book.title}</strong> - {book.author}
          </p>
          <div className="flex items-center gap-2">
            <label htmlFor="isPrivate" className="text-sm text-secondary">
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
          <FormGroup className="flex-1">
            <FormLabel>시작 페이지</FormLabel>
            <Input
              type="number"
              placeholder="ex. 10"
              value={fromPage}
              onChange={(e) => setFromPage(e.target.value)}
            />
          </FormGroup>
          <FormGroup className="flex-1">
            <FormLabel>종료 페이지</FormLabel>
            <Input
              type="number"
              placeholder="ex. 25"
              value={toPage}
              max={book.total_pages ?? undefined}
              onChange={(e) => setToPage(e.target.value)}
            />
          </FormGroup>
        </div>

        <FormGroup>
          <FormLabel>읽은 날짜</FormLabel>
          <Input type="date" value={new Date().toISOString().split('T')[0]} readOnly disabled />
        </FormGroup>

        <FormGroup>
          <FormLabel>줄거리 요약</FormLabel>
          <Textarea
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            placeholder="오늘 읽은 내용을 간단히 정리해보세요..."
            rows={5}
            fullWidth
            className="resize-none"
          />
        </FormGroup>

        {error && <p className="text-red-500 text-sm">{error}</p>}
        {/* {success && <p className="text-green-500 text-sm">기록이 성공적으로 저장되었습니다.</p>} */}

        <div className="flex justify-end">
          <Button type="submit">📥 기록 저장하기</Button>
        </div>
      </AnimatedSection>
    </form>
  );
}
