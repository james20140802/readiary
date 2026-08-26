'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Lock, Plus } from 'lucide-react';
import { MyBook } from '@/types/book';
import { todayKST } from '@/lib/dates';
import Card from '@/components/ui/Card';
import Chip from '@/components/ui/Chip';
import Button from '@/components/ui/Button';
import { Textarea } from '@/components/ui/Textarea';
import Seal from '@/components/ui/Seal';
import Input from '@/components/ui/Input';

interface ComposerProps {
  books: MyBook[];
  recentUserBookId: string | null;
  userId: string;
}

type Mode = 'quote' | 'note';

interface SavedEntry {
  id: string;
  mode: Mode;
  text: string;
  bookTitle: string;
}

const MAX_BOOK_CHIPS = 4;

/** 홈 최상단 기록 입력창 — 문장 한 줄로 기록을 시작한다 (스펙 §4) */
export default function Composer({ books, recentUserBookId, userId }: ComposerProps) {
  const router = useRouter();
  const initialSelected =
    books.find((b) => b.id === recentUserBookId)?.id ?? books[0]?.id ?? null;

  const [selectedId, setSelectedId] = useState<string | null>(initialSelected);
  const [mode, setMode] = useState<Mode>('quote');
  const [text, setText] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [savedEntry, setSavedEntry] = useState<SavedEntry | null>(null);
  const [showExtraText, setShowExtraText] = useState(false);
  const [showPages, setShowPages] = useState(false);
  const [extraText, setExtraText] = useState('');
  const [fromPage, setFromPage] = useState('');
  const [toPage, setToPage] = useState('');

  if (books.length === 0) return null;

  const selectedBook = books.find((b) => b.id === selectedId) ?? null;
  const head = books.slice(0, MAX_BOOK_CHIPS);
  const chipBooks =
    selectedBook && !head.some((b) => b.id === selectedBook.id)
      ? [selectedBook, ...head.slice(0, MAX_BOOK_CHIPS - 1)]
      : head;

  const handleSave = async () => {
    if (!selectedBook || text.trim() === '' || isSubmitting) return;
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/entries/new', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_book_id: selectedBook.id,
          quote: mode === 'quote' ? text.trim() : null,
          note: mode === 'note' ? text.trim() : null,
          date: todayKST(),
          is_private: isPrivate,
          book_id: selectedBook.book_id,
          user_id: userId,
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.id) {
        toast.error(data?.error ?? '저장에 실패했어요.');
        return;
      }
      setSavedEntry({
        id: data.id,
        mode,
        text: text.trim(),
        bookTitle: selectedBook.books.title,
      });
      setText('');
      setIsPrivate(false);
      router.refresh();
    } catch {
      toast.error('서버와 통신 중 오류가 발생했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetAll = () => {
    setSavedEntry(null);
    setShowExtraText(false);
    setShowPages(false);
    setExtraText('');
    setFromPage('');
    setToPage('');
    setMode('quote');
  };

  const handleExpand = async () => {
    if (!savedEntry || isSubmitting) return;
    if (fromPage !== '' && toPage !== '' && Number(fromPage) > Number(toPage)) {
      toast.error('시작 페이지는 종료 페이지보다 작거나 같아야 합니다.');
      return;
    }
    const body: Record<string, unknown> = {};
    if (showExtraText && extraText.trim() !== '') {
      body[savedEntry.mode === 'quote' ? 'note' : 'quote'] = extraText.trim();
    }
    if (showPages && (fromPage !== '' || toPage !== '')) {
      body.from_page = fromPage === '' ? null : Number(fromPage);
      body.to_page = toPage === '' ? null : Number(toPage);
    }
    if (Object.keys(body).length === 0) {
      resetAll();
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/entries/${savedEntry.id}/edit`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        toast.error(data?.error ?? '덧붙이기에 실패했어요.');
        return;
      }
      toast.success('기록에 덧붙였어요.');
      resetAll();
      router.refresh();
    } catch {
      toast.error('서버와 통신 중 오류가 발생했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (savedEntry) {
    return (
      <Card hoverable={false} className="mb-8">
        <Seal>오늘의 기록</Seal>
        <p className="mt-2 font-serif text-quote text-ink">{savedEntry.text}</p>
        <p className="mt-1 text-caption text-ink-sub">{savedEntry.bookTitle}</p>

        {!showExtraText && !showPages ? (
          <div className="mt-4 flex flex-wrap gap-2">
            <Chip onClick={() => setShowExtraText(true)} disabled={isSubmitting}>
              {savedEntry.mode === 'quote' ? '생각 덧붙이기' : '문장 덧붙이기'}
            </Chip>
            <Chip onClick={() => setShowPages(true)} disabled={isSubmitting}>
              페이지 남기기
            </Chip>
            <Chip onClick={resetAll} disabled={isSubmitting}>
              닫기
            </Chip>
          </div>
        ) : (
          <div className="mt-4 space-y-3">
            {showExtraText && (
              <Textarea
                value={extraText}
                onChange={(e) => setExtraText(e.target.value)}
                placeholder={
                  savedEntry.mode === 'quote'
                    ? '이 문장에 대한 생각을 덧붙여보세요'
                    : '책에서 마음에 남은 문장을 옮겨 적어보세요'
                }
                rows={3}
                fullWidth
                className="resize-none"
              />
            )}
            {showPages && (
              <div className="flex gap-3">
                <Input
                  type="number"
                  placeholder="시작 페이지"
                  value={fromPage}
                  onChange={(e) => setFromPage(e.target.value)}
                />
                <Input
                  type="number"
                  placeholder="종료 페이지"
                  value={toPage}
                  onChange={(e) => setToPage(e.target.value)}
                />
              </div>
            )}
            <div className="flex flex-wrap items-center gap-2">
              {!showExtraText && (
                <Chip onClick={() => setShowExtraText(true)} disabled={isSubmitting}>
                  {savedEntry.mode === 'quote' ? '생각 덧붙이기' : '문장 덧붙이기'}
                </Chip>
              )}
              {!showPages && (
                <Chip onClick={() => setShowPages(true)} disabled={isSubmitting}>
                  페이지 남기기
                </Chip>
              )}
              <div className="ml-auto flex gap-2">
                <Button size="sm" variant="ghost" onClick={resetAll} disabled={isSubmitting}>
                  닫기
                </Button>
                <Button size="sm" onClick={handleExpand} disabled={isSubmitting}>
                  {isSubmitting ? '저장 중...' : '덧붙이기'}
                </Button>
              </div>
            </div>
          </div>
        )}
      </Card>
    );
  }

  return (
    <Card hoverable={false} className="mb-8">
      <div className="flex flex-wrap items-center gap-2">
        {chipBooks.map((b) => (
          <Chip
            key={b.id}
            selected={b.id === selectedId}
            dot={b.id === selectedId}
            onClick={() => setSelectedId(b.id)}
          >
            <span className="max-w-[8rem] truncate">{b.books.title}</span>
          </Chip>
        ))}
        <Chip onClick={() => router.push('/protected/books/new')} aria-label="새 책 등록">
          <Plus size={12} strokeWidth={1.75} aria-hidden />새 책
        </Chip>
      </div>

      <Textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="오늘 마음에 남은 문장을 남겨보세요"
        rows={3}
        fullWidth
        className="mt-4 resize-none font-serif"
      />

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Chip selected={mode === 'quote'} onClick={() => setMode('quote')}>
            문장
          </Chip>
          <Chip selected={mode === 'note'} onClick={() => setMode('note')}>
            생각
          </Chip>
          <Chip
            selected={isPrivate}
            aria-pressed={isPrivate}
            onClick={() => setIsPrivate((v) => !v)}
          >
            <Lock size={12} strokeWidth={1.75} aria-hidden />
            비공개
          </Chip>
        </div>
        <Button
          size="sm"
          onClick={handleSave}
          disabled={isSubmitting || text.trim() === ''}
        >
          {isSubmitting ? '저장 중...' : '저장'}
        </Button>
      </div>
    </Card>
  );
}
