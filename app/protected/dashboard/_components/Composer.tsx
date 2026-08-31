'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { LibraryBig, Lock } from 'lucide-react';
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

/** 칩으로 노출하는 책 수 상한 — 진행 중인 책이 많아도 옵션 줄이 무한정 길어지지 않게 (좁은 폭에선 2권) */
const MAX_BOOK_CHIPS = 3;

/** 홈 최상단 기록 입력창 — 문장 한 줄로 기록을 시작한다 (스펙 §4) */
export default function Composer({ books, recentUserBookId, userId }: ComposerProps) {
  const router = useRouter();
  const initialSelected = books.find((b) => b.id === recentUserBookId)?.id ?? books[0]?.id ?? null;

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

  // 초기 선택 책을 맨 앞에 두고 상한만큼 자른다 — 선택은 보이는 칩에서만 일어나므로
  // 선택된 책이 잘려나가는 일은 없다. (selectedId 기준 재정렬은 탭마다 칩이 튀어 금지)
  const chipBooks = useMemo(() => {
    const first = books.find((b) => b.id === initialSelected);
    const ordered = first ? [first, ...books.filter((b) => b.id !== first.id)] : books;
    return ordered.slice(0, MAX_BOOK_CHIPS);
  }, [books, initialSelected]);

  if (books.length === 0) return null;

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
      <Card hoverable={false}>
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

  // 시안 .composer — 카드 안 텍스트 영역은 박스 없이, 아래 헤어라인 한 줄로만 구분.
  // 옵션은 "들어가면 한 줄, 모자라면 역할별 두 줄": 컨트롤 그룹(문장/생각·비공개·남기기)을
  // 내부 줄바꿈 없는 한 덩어리로 묶어, 폭이 부족하면 덩어리째 둘째 줄로 내려가게 한다.
  // (칩 사이 임의 지점에서 끊기는 랩·가로 스크롤은 2026-08-31 사용자 결정으로 배제)
  return (
    <Card hoverable={false}>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="오늘 마음에 남은 문장을 남겨보세요"
        rows={3}
        aria-label="기록 입력"
        className="block w-full resize-none bg-transparent font-serif text-[17px] leading-relaxed text-ink placeholder:text-ink-faint focus:outline-none"
      />

      {/* 그룹 사이 세로줄은 컨트롤 그룹의 before 가상요소로 왼쪽 여백(17px = 8+1+8)에 그린다.
          컨트롤 그룹이 둘째 줄로 내려가면 래퍼의 음수 마진 + overflow-x-clip이 세로줄을
          잘라내므로, 한 줄일 때만 구분선이 보인다. */}
      <div className="mt-3.5 overflow-x-clip border-t border-hairline pt-3.5">
        <div className="-ml-[17px] flex flex-wrap items-center gap-y-2.5">
          <div className="ml-[17px] flex flex-wrap items-center gap-2">
            {chipBooks.map((b, i) => (
              <Chip
                key={b.id}
                selected={b.id === selectedId}
                dot={b.id === selectedId}
                onClick={() => setSelectedId(b.id)}
                // 좁은 폭에선 2권까지만 — 단 선택된 칩은 순서와 무관하게 항상 남긴다
                className={i >= 2 && b.id !== selectedId ? 'hidden sm:inline-flex' : undefined}
              >
                <span className="max-w-[8rem] truncate">{b.books.title}</span>
              </Chip>
            ))}
            {/* 칩은 진행 중인 책 일부만 보여주므로, 전체 목록(내 책)으로 가는 문을 둔다 */}
            <Chip onClick={() => router.push('/protected/books')} aria-label="내 책 전체 보기">
              <LibraryBig size={12} strokeWidth={1.75} aria-hidden />내 책
            </Chip>
          </div>
          <div className="relative ml-[17px] flex flex-1 items-center gap-2 before:absolute before:-left-[9px] before:top-1/2 before:h-4 before:w-px before:-translate-y-1/2 before:bg-hairline">
            <Chip selected={mode === 'quote'} onClick={() => setMode('quote')}>
              문장
            </Chip>
            <Chip selected={mode === 'note'} onClick={() => setMode('note')}>
              생각
            </Chip>
            <span aria-hidden className="h-4 w-px shrink-0 bg-hairline" />
            <Chip
              selected={isPrivate}
              aria-pressed={isPrivate}
              onClick={() => setIsPrivate((v) => !v)}
            >
              <Lock size={12} strokeWidth={1.75} aria-hidden />
              비공개
            </Chip>
            <Button
              size="sm"
              className="ml-auto"
              onClick={handleSave}
              disabled={isSubmitting || text.trim() === ''}
            >
              {isSubmitting ? '남기는 중...' : '남기기'}
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}
