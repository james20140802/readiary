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

  if (books.length === 0) return null;

  const chipBooks = books.slice(0, MAX_BOOK_CHIPS);
  const selectedBook = books.find((b) => b.id === selectedId) ?? null;

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

  if (savedEntry) {
    // Task 5에서 확장 UI로 교체된다 — Task 4 시점에는 최소 확인 카드만
    return (
      <Card hoverable={false} className="mb-8">
        <p className="font-serif text-quote text-ink">{savedEntry.text}</p>
        <p className="mt-2 text-caption text-ink-sub">{savedEntry.bookTitle}</p>
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
