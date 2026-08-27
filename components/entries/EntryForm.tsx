'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Lock } from 'lucide-react';
import { Book } from '@/types/book';
import { todayKST } from '@/lib/dates';
import { hasEntryContent } from '@/lib/entries/validation';
import Button from '@/components/ui/Button';
import Chip from '@/components/ui/Chip';
import Input from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import FormGroup from '@/components/ui/FormGroup';
import FormLabel from '@/components/ui/FormLabel';
import AnimatedSection from '@/components/ui/AnimatedSection';
import BackButton from '@/components/ui/BackButton';

export interface EntryFormValues {
  quote: string | null;
  note: string | null;
  from_page: number | null;
  to_page: number | null;
  date: string;
  is_private: boolean;
}

interface EntryFormProps {
  book: Book;
  heading: string;
  submitLabel: string;
  initial?: Partial<{
    quote: string;
    note: string;
    fromPage: number | null;
    toPage: number | null;
    date: string;
    isPrivate: boolean;
  }>;
  onSubmit: (values: EntryFormValues) => Promise<string | null>;
}

/** 신규/수정이 공유하는 기록 폼 — 문장·생각 중 하나만 있으면 저장, 날짜 백필 허용, 페이지 선택 */
export default function EntryForm({ book, heading, submitLabel, initial, onSubmit }: EntryFormProps) {
  const [quote, setQuote] = useState(initial?.quote ?? '');
  const [note, setNote] = useState(initial?.note ?? '');
  const [fromPage, setFromPage] = useState(initial?.fromPage?.toString() ?? '');
  const [toPage, setToPage] = useState(initial?.toPage?.toString() ?? '');
  const [date, setDate] = useState(initial?.date ?? todayKST());
  const [isPrivate, setIsPrivate] = useState(initial?.isPrivate ?? false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!hasEntryContent(quote, note)) {
      setError('문장이나 생각 중 하나는 남겨주세요.');
      return;
    }
    if (fromPage !== '' && toPage !== '' && Number(fromPage) > Number(toPage)) {
      setError('시작 페이지는 종료 페이지보다 작거나 같아야 합니다.');
      return;
    }
    if (date === '') {
      setError('읽은 날짜를 선택해주세요.');
      return;
    }

    setIsSubmitting(true);
    try {
      const message = await onSubmit({
        quote: quote.trim() === '' ? null : quote.trim(),
        note: note.trim() === '' ? null : note.trim(),
        from_page: fromPage === '' ? null : Number(fromPage),
        to_page: toPage === '' ? null : Number(toPage),
        date,
        is_private: isPrivate,
      });
      if (message) setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <header className="mb-6 flex items-center">
        <BackButton />
        <h1 className="text-page-title ml-4">{heading}</h1>
      </header>

      <AnimatedSection>
        <div className="mx-auto max-w-2xl space-y-8 py-4 sm:py-6">
          <div className="flex flex-col items-start justify-between gap-6 border-b border-hairline pb-6 sm:flex-row">
            <div className="flex items-center gap-4">
              <Image
                src={book.cover_url ?? '/images/default-book-cover.png'}
                alt="책 표지"
                width={48}
                height={72}
                className="rounded object-cover"
              />
              <div className="flex flex-col">
                <strong className="font-serif text-xl leading-tight text-ink">
                  {book.title ?? '제목 없음'}
                </strong>
                <span className="mt-1 text-sm font-medium text-ink-sub">
                  {book.author ?? '저자 미상'}
                </span>
              </div>
            </div>
            <Chip
              selected={isPrivate}
              aria-pressed={isPrivate}
              onClick={() => setIsPrivate((v) => !v)}
              className="self-end sm:self-auto"
            >
              <Lock size={12} strokeWidth={1.75} aria-hidden />
              비공개
            </Chip>
          </div>

          <FormGroup>
            <FormLabel>문장</FormLabel>
            <Textarea
              value={quote}
              onChange={(e) => setQuote(e.target.value)}
              placeholder="책에서 마음에 남은 문장을 옮겨 적어보세요"
              rows={3}
              fullWidth
              className="resize-none font-serif"
            />
          </FormGroup>

          <FormGroup>
            <FormLabel>생각</FormLabel>
            <Textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="이 문장에 대한 생각, 혹은 오늘의 감상"
              rows={5}
              fullWidth
              className="resize-none"
            />
          </FormGroup>

          <div className="flex flex-col gap-4 sm:flex-row">
            <FormGroup className="min-w-0 flex-1">
              <FormLabel>시작 페이지 (선택)</FormLabel>
              <Input
                type="number"
                placeholder="ex. 10"
                value={fromPage}
                onChange={(e) => setFromPage(e.target.value)}
                className="w-full"
              />
            </FormGroup>
            <FormGroup className="min-w-0 flex-1">
              <FormLabel>종료 페이지 (선택)</FormLabel>
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

          <FormGroup className="w-full min-w-0">
            <FormLabel>읽은 날짜</FormLabel>
            <Input
              type="date"
              value={date}
              max={todayKST()}
              onChange={(e) => setDate(e.target.value)}
              className="w-full"
            />
          </FormGroup>

          {error && <p className="text-sm font-medium text-danger">{error}</p>}

          <div className="flex justify-end pt-4">
            <Button type="submit" disabled={isSubmitting} className="w-full sm:w-auto">
              {isSubmitting ? '저장 중...' : submitLabel}
            </Button>
          </div>
        </div>
      </AnimatedSection>
    </form>
  );
}
