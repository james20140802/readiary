'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Book } from '@/types/book';
import { Textarea } from '@/components/ui/Textarea';
import { Input } from '@/components/ui/Input';
import FormGroup from '@/components/ui/FormGroup';
import Button from '@/components/ui/Button';
import FormLabel from '@/components/ui/FormLabel';
import AnimatedSection from '@/components/ui/AnimatedSection';
import BackButton from '@/components/ui/BackButton';
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
    <form onSubmit={handleSubmit} className="space-y-6">
      <header className="flex items-center mb-6">
        <BackButton />
        <h1 className="text-page-title text-label dark:text-label-invert ml-4">🌤️ 독서 기록 수정</h1>
      </header>
      <AnimatedSection>
        <div className="max-w-2xl mx-auto py-4 sm:py-6 space-y-8">
          <div className="flex flex-col sm:flex-row justify-between items-start gap-6 pb-6 border-b border-border dark:border-dark-border">
            <div className="flex items-center gap-4">
              <Image
                src={book.cover_url ?? '/images/default-book-cover.png'}
                alt="Book cover"
                width={48}
                height={72}
                className="rounded shadow object-cover"
              />
              <div className="flex flex-col">
                <strong className="text-xl text-label dark:text-label-invert leading-tight">
                  {book.title ?? '제목 없음'}
                </strong>
                <span className="text-label-sub text-sm font-medium mt-1">{book.author ?? '저자 미상'}</span>
              </div>
            </div>
            <div className="flex items-center gap-3 self-end sm:self-auto mt-4 sm:mt-0">
              <span className="text-sm text-label-sub font-medium">🔒 비공개</span>
              <button
                type="button"
                onClick={() => setIsPrivate(!isPrivate)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-tint focus:ring-offset-2 dark:focus:ring-offset-dark-page ${
                  isPrivate ? 'bg-tint' : 'bg-surface-raised dark:bg-dark-border'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    isPrivate ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
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
              onChange={(e) => setToPage(e.target.value)}
            />
          </FormGroup>
        </div>

        <FormGroup>
          <FormLabel>읽은 날짜</FormLabel>
          <Input
            type="date"
            value={date}
            max={new Date().toISOString().split('T')[0]}
            onChange={(e) => setDate(e.target.value)}
          />
        </FormGroup>

        <FormGroup>
          <FormLabel>줄거리 요약</FormLabel>
          <Textarea
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            placeholder="오늘 읽은 내용을 간단히 정리해보세요..."
            rows={5}
            className="resize-none"
            fullWidth
          />
        </FormGroup>

        {error && <p className="text-sm text-red-500">{error}</p>}

          <div className="flex justify-end pt-4">
            <Button type="submit" className="w-full sm:w-auto">✅ 기록 수정하기</Button>
          </div>
        </div>
      </AnimatedSection>
    </form>
  );
}
