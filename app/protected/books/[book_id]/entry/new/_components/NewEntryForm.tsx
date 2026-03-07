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
import BackButton from '@/components/ui/BackButton';

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
  const [isPrivate, setIsPrivate] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false); // 2. 제출 상태 추가
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

    setIsSubmitting(true); // 2. 비활성화 시작

    try {
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
        toast.success('기록이 성공적으로 저장되었습니다.');
        await awardBadges(userId);
        router.push(`/protected/books/${bookId}`);
      }
    } catch (err) {
      console.error(err);
      setError('서버와 통신 중 오류가 발생했습니다.');
    } finally {
      setIsSubmitting(false); // 2. 비활성화 해제
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <header className="flex items-center mb-6">
        <BackButton />
        <h1 className="text-page-title ml-4">📓 오늘의 독서 기록</h1>
      </header>

      <AnimatedSection>
        {/* 1. 책 제목과 지은이 줄바꿈 처리 */}
        <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
          <div className="flex flex-col">
            <strong className="text-xl text-label dark:text-white leading-tight">
              {book.title}
            </strong>
            <span className="text-secondary text-sm font-medium mt-1">{book.author}</span>
          </div>
          <div className="flex items-center gap-2 self-end sm:self-auto">
            <label htmlFor="isPrivate" className="text-sm text-secondary cursor-pointer">
              🔒 비공개로 저장
            </label>
            <input
              id="isPrivate"
              type="checkbox"
              checked={isPrivate}
              onChange={(e) => setIsPrivate(e.target.checked)}
              className="w-4 h-4 cursor-pointer"
            />
          </div>
        </div>

        {/* 페이지 입력 (기존 가로 정렬 방식 복구) */}
        <div className="flex flex-col gap-4 sm:flex-row">
          <FormGroup className="flex-1 min-w-0">
            <FormLabel>시작 페이지</FormLabel>
            <Input
              type="number"
              placeholder="ex. 10"
              value={fromPage}
              onChange={(e) => setFromPage(e.target.value)}
              className="w-full"
            />
          </FormGroup>
          <FormGroup className="flex-1 min-w-0">
            <FormLabel>종료 페이지</FormLabel>
            <Input
              type="number"
              placeholder="ex. 25"
              value={toPage}
              max={book.total_pages ?? undefined}
              onChange={(e) => setToPage(e.target.value)}
              className="w-full"
            />
          </FormGroup>
        </div>

        {/* 날짜 입력 (기존 독자 줄 방식 복구) */}
        <FormGroup className="w-full min-w-0">
          <FormLabel>읽은 날짜</FormLabel>
          <Input
            type="date"
            value={new Date().toISOString().split('T')[0]}
            readOnly
            disabled
            className="w-full appearance-none bg-surface dark:bg-dark-surface border-border-subtle dark:border-dark-border"
          />
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

        {error && <p className="text-red-500 text-sm font-medium">{error}</p>}

        {/* 2. 제출 시 버튼 비활성화 */}
        <div className="flex justify-end pt-2">
          <Button type="submit" disabled={isSubmitting} className="w-full sm:w-auto">
            {isSubmitting ? '저장 중...' : '📥 기록 저장하기'}
          </Button>
        </div>
      </AnimatedSection>
    </form>
  );
}
