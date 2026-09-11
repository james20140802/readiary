'use client';

import { apiFetch } from '@/lib/api/fetch';
import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import { clearSubmittedComposerDraft } from '@/lib/entries/composerDraft';
import { useComposerDraft } from '@/hooks/useComposerDraft';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { LibraryBig, Lock } from 'lucide-react';
import { MyBook } from '@/types/book';
import Link from 'next/link';
import Card from '@/components/ui/Card';
import Chip from '@/components/ui/Chip';
import Button from '@/components/ui/Button';
import Seal from '@/components/ui/Seal';

interface ComposerProps {
  userId: string;
  books: MyBook[];
  recentUserBookId: string | null;
}

type Mode = 'quote' | 'note';

interface SavedEntry {
  id: string;
  mode: Mode;
  text: string;
  bookTitle: string;
}

/** 홈 최상단 기록 입력창 — 문장 한 줄로 기록을 시작한다 (스펙 §4) */
export default function Composer({ userId, books, recentUserBookId }: ComposerProps) {
  const router = useRouter();
  const initialSelected = books.find((b) => b.id === recentUserBookId)?.id ?? books[0]?.id ?? null;

  const {
    draft,
    update,
    discard,
    beginSubmission,
    releaseSubmission,
    ready,
    storageError,
    isActive,
  } = useComposerDraft(userId, initialSelected);
  const { selectedId, mode, isPrivate } = draft;
  const text = draft[mode];
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submitLock = useRef(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const locked = isSubmitting || Boolean(draft.submission);
  const [savedEntry, setSavedEntry] = useState<SavedEntry | null>(null);
  const [showExtraText, setShowExtraText] = useState(false);
  const [showPages, setShowPages] = useState(false);
  const [extraText, setExtraText] = useState('');
  const [fromPage, setFromPage] = useState('');
  const [toPage, setToPage] = useState('');

  const chipBooks = useMemo(() => {
    const first = books.find((b) => b.id === initialSelected);
    const ordered = first ? [first, ...books.filter((b) => b.id !== first.id)] : books;
    const preview = ordered.slice(0, 3);
    const restored = books.find((b) => b.id === selectedId);
    // 최근 기록 책이 달라져도 초안의 저장 대상은 칩에서 확인할 수 있어야 한다.
    if (restored && !preview.some((b) => b.id === restored.id)) {
      return [...preview.slice(0, 2), restored];
    }
    return preview;
  }, [books, initialSelected, selectedId]);
  const selectedBook = books.find((b) => b.id === selectedId) ?? null;
  const controlsRef = useRef<HTMLDivElement>(null);
  const booksRef = useRef<HTMLDivElement>(null);
  const [visibleBookIds, setVisibleBookIds] = useState<string[] | null>(null);

  useLayoutEffect(() => {
    const controls = controlsRef.current;
    const row = booksRef.current;
    if (!controls || !row) return;
    const fitBooks = () => {
      const chips = Array.from(row.querySelectorAll<HTMLButtonElement>('[data-book-id]'));
      const allBooks = row.querySelector<HTMLButtonElement>('[data-all-books]');
      if (!allBooks) return;
      let remaining = controls.clientWidth - allBooks.offsetWidth;
      const priority = [...chips].sort(
        (a, b) => Number(b.dataset.bookId === selectedId) - Number(a.dataset.bookId === selectedId)
      );
      const visible: string[] = [];
      for (const chip of priority) {
        const width = chip.offsetWidth + 8;
        if (width <= remaining || visible.length === 0) {
          visible.push(chip.dataset.bookId!);
          remaining -= width;
        }
      }
      setVisibleBookIds((previous) => (previous?.join() === visible.join() ? previous : visible));
    };
    const observer = new ResizeObserver(fitBooks);
    observer.observe(controls);
    for (const child of row.children) observer.observe(child);
    fitBooks();
    return () => observer.disconnect();
  }, [chipBooks, selectedId, savedEntry]);

  const handleSave = async () => {
    if (
      !ready ||
      !isActive() ||
      submitLock.current ||
      (!draft.submission && (!selectedBook || (!draft.quote.trim() && !draft.note.trim())))
    )
      return;
    submitLock.current = true;
    setSaveError(null);
    const submitted = beginSubmission(selectedBook?.books.title ?? '선택한 책');
    if (!submitted?.submission) {
      submitLock.current = false;
      setSaveError('저장 준비를 보관하지 못했어요. 브라우저 저장 공간을 확인해 주세요.');
      return;
    }
    const submission = submitted.submission;
    setIsSubmitting(true);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    try {
      const res = await apiFetch('/api/entries/new', {
        method: 'POST',
        signal: controller.signal,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_entry_id: submission.id,
          user_book_id: submitted.selectedId,
          quote: submitted.quote.trim() || null,
          note: submitted.note.trim() || null,
          date: submission.date,
          is_private: submitted.isPrivate,
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || data?.id !== submission.id) {
        if (!isActive()) return;
        if ([400, 403].includes(res.status)) {
          releaseSubmission(submitted);
          setSaveError(data?.error ?? '저장하지 못했어요. 입력을 확인하고 다시 남겨 주세요.');
        } else {
          setSaveError(
            '저장 결과를 확인하지 못했어요. 같은 기록으로 안전하게 다시 시도할 수 있어요.'
          );
        }
        toast.error(data?.error ?? '저장 결과를 확인하지 못했어요.');
        return;
      }
      clearSubmittedComposerDraft(submitted);
      if (!isActive()) return;
      setSavedEntry({
        id: data.id,
        mode: submitted.quote.trim() ? 'quote' : 'note',
        text: submitted.quote.trim() || submitted.note.trim(),
        bookTitle: submission.bookTitle,
      });
      setExtraText(submitted.quote.trim() ? submitted.note : '');
      setShowExtraText(Boolean(submitted.quote.trim() && submitted.note.trim()));
      discard();
      router.refresh();
    } catch {
      if (!isActive()) return;
      setSaveError(
        '응답을 받지 못했어요. 기록이 이미 남겨졌을 수 있으니 저장 확인·재시도를 눌러 주세요.'
      );
      toast.error('저장 결과를 확인하지 못했어요.');
    } finally {
      clearTimeout(timeout);
      submitLock.current = false;
      setIsSubmitting(false);
    }
  };

  const resetAll = () => {
    setSavedEntry(null);
    setSaveError(null);
    setShowExtraText(false);
    setShowPages(false);
    setExtraText('');
    setFromPage('');
    setToPage('');
    update({ mode: 'quote' });
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
      const res = await apiFetch(`/api/entries/${savedEntry.id}/edit`, {
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

  // 저장 뒤 덧붙이기 — 첫 단계와 같은 종이 문법. 입력은 박스 없이 헤어라인 아래에 바로,
  // 쪽수는 기록 폼(EntryForm)과 같은 "p. __ – __" 인라인 입력. (박스형 Textarea/Input 금지)
  if (savedEntry && ready) {
    const extraLabel = savedEntry.mode === 'quote' ? '생각' : '문장';
    const expanded = showExtraText || showPages;
    return (
      <Card hoverable={false}>
        <Seal>오늘의 기록</Seal>
        <p role="status" className="mt-2 text-caption text-ink-sub">
          기록을 남겼어요.
        </p>
        <Link
          className="text-caption text-accent underline"
          href={`/protected/entry/${savedEntry.id}`}
        >
          남긴 기록 보기
        </Link>
        <p className="mt-2 whitespace-pre-wrap font-serif text-quote text-ink">{savedEntry.text}</p>
        <p className="mt-1 text-caption text-ink-sub">{savedEntry.bookTitle}</p>

        {showExtraText && (
          <div className="mt-4 border-t border-hairline pt-4">
            <label htmlFor="composer-extra" className="text-[11.5px] font-medium text-ink-faint">
              {extraLabel}
            </label>
            <textarea
              id="composer-extra"
              value={extraText}
              onChange={(e) => setExtraText(e.target.value)}
              placeholder={
                savedEntry.mode === 'quote'
                  ? '이 문장에 대한 생각을 덧붙여보세요'
                  : '책에서 마음에 남은 문장을 옮겨 적어보세요'
              }
              rows={3}
              autoFocus
              className="mt-2 block w-full resize-none border-b border-transparent bg-transparent font-serif text-[15px] leading-relaxed text-ink transition-colors placeholder:text-ink-faint focus:border-hairline-strong focus:outline-none"
            />
          </div>
        )}

        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-3 border-t border-hairline pt-3.5">
          {showPages && (
            <div className="flex items-center gap-1 text-[13px] tabular-nums text-ink-sub">
              <span className="text-ink-faint">p.</span>
              <input
                type="number"
                inputMode="numeric"
                aria-label="시작 페이지"
                placeholder="10"
                value={fromPage}
                autoFocus={!showExtraText}
                onChange={(e) => setFromPage(e.target.value)}
                className="w-11 border-b border-transparent bg-transparent text-center text-ink placeholder:text-ink-faint focus:border-hairline-strong focus:outline-none"
              />
              <span className="text-ink-faint">–</span>
              <input
                type="number"
                inputMode="numeric"
                aria-label="종료 페이지"
                placeholder="25"
                value={toPage}
                onChange={(e) => setToPage(e.target.value)}
                className="w-11 border-b border-transparent bg-transparent text-center text-ink placeholder:text-ink-faint focus:border-hairline-strong focus:outline-none"
              />
            </div>
          )}
          {!showExtraText && (
            <Chip onClick={() => setShowExtraText(true)} disabled={isSubmitting}>
              {extraLabel} 덧붙이기
            </Chip>
          )}
          {!showPages && (
            <Chip onClick={() => setShowPages(true)} disabled={isSubmitting}>
              페이지 남기기
            </Chip>
          )}
          {expanded ? (
            <div className="ml-auto flex items-center gap-2">
              <Button size="sm" variant="ghost" onClick={resetAll} disabled={isSubmitting}>
                닫기
              </Button>
              <Button size="sm" onClick={handleExpand} disabled={isSubmitting}>
                {isSubmitting ? '저장 중...' : '덧붙이기'}
              </Button>
            </div>
          ) : (
            <Chip className="ml-auto" onClick={resetAll} disabled={isSubmitting}>
              닫기
            </Chip>
          )}
        </div>
      </Card>
    );
  }

  // 기존 책 칩과 내 책장 이동을 유지하며 입력만 자동 보관한다.
  if (books.length === 0 && !draft.quote && !draft.note) return null;
  return (
    <Card hoverable={false}>
      <textarea
        value={text}
        onChange={(e) => update({ [mode]: e.target.value })}
        disabled={!ready || locked}
        placeholder={
          mode === 'quote'
            ? '오늘 마음에 남은 문장을 남겨보세요'
            : '책을 읽으며 떠오른 생각을 남겨보세요'
        }
        rows={3}
        aria-label="기록 입력"
        className="block w-full resize-none bg-transparent font-serif text-[17px] leading-relaxed text-ink placeholder:text-ink-faint focus:outline-none"
      />

      <div className="mt-3.5 border-t border-hairline pt-3.5">
        <div
          ref={controlsRef}
          className="flex flex-wrap items-center gap-x-4 gap-y-2.5 [container-type:inline-size]"
        >
          <div
            ref={booksRef}
            className="relative flex max-w-full flex-none items-center gap-2 whitespace-nowrap"
          >
            {chipBooks.map((b) => (
              <Chip
                key={b.id}
                selected={b.id === selectedId}
                dot={b.id === selectedId}
                disabled={!ready || locked}
                aria-pressed={b.id === selectedId}
                onClick={() => update({ selectedId: b.id })}
                data-book-id={b.id}
                aria-hidden={visibleBookIds !== null && !visibleBookIds.includes(b.id)}
                tabIndex={
                  visibleBookIds !== null && !visibleBookIds.includes(b.id) ? -1 : undefined
                }
                className="shrink-0"
                style={
                  visibleBookIds !== null && !visibleBookIds.includes(b.id)
                    ? { position: 'absolute', visibility: 'hidden', pointerEvents: 'none' }
                    : undefined
                }
              >
                <span className="max-w-[min(8rem,calc(100cqw-7.5rem))] truncate">
                  {b.books.title}
                </span>
              </Chip>
            ))}
            {/* 칩은 진행 중인 책 일부만 보여주므로, 전체 목록(내 책)으로 가는 문을 둔다 */}
            <Chip
              data-all-books
              className="shrink-0"
              onClick={() => router.push('/protected/books')}
              aria-label="내 책 전체 보기"
            >
              <LibraryBig size={12} strokeWidth={1.75} aria-hidden />내 책
            </Chip>
          </div>
          <div className="flex min-w-max flex-auto items-center gap-1 whitespace-nowrap [&>button]:shrink-0 [&>button]:px-2">
            <Chip
              selected={mode === 'quote'}
              disabled={!ready || locked}
              onClick={() => update({ mode: 'quote' })}
            >
              문장
            </Chip>
            <Chip
              selected={mode === 'note'}
              disabled={!ready || locked}
              onClick={() => update({ mode: 'note' })}
            >
              생각
            </Chip>
            <span aria-hidden className="h-4 w-px shrink-0 bg-hairline" />
            <Chip
              selected={isPrivate}
              aria-pressed={isPrivate}
              disabled={!ready || locked}
              onClick={() => update({ isPrivate: !isPrivate })}
            >
              <Lock size={12} strokeWidth={1.75} aria-hidden />
              비공개
            </Chip>
            {!draft.submission && (
              <Button
                size="sm"
                className="ml-auto"
                onClick={handleSave}
                disabled={
                  !ready ||
                  isSubmitting ||
                  !selectedBook ||
                  (!draft.quote.trim() && !draft.note.trim())
                }
              >
                남기기
              </Button>
            )}
          </div>
        </div>
      </div>
      {storageError && (draft.quote || draft.note) && (
        <p role="alert" className="mt-2 text-caption text-ink-sub">
          초안을 보관하지 못했어요. 브라우저 저장 공간을 확인해 주세요.
        </p>
      )}
      {(draft.submission || saveError) && (
        <div className="mt-3 space-y-3 border-t border-hairline pt-3">
          <p role={saveError ? 'alert' : 'status'} className="text-caption text-ink-sub">
            {isSubmitting
              ? '기록을 남기는 중이에요.'
              : (saveError ??
                '이전에 요청한 저장 결과를 확인해 주세요. 다시 시도해도 같은 기록으로 처리됩니다.')}
          </p>
          {draft.submission && !isSubmitting && (
            <div className="flex flex-wrap items-center gap-3">
              <Button size="sm" onClick={handleSave} disabled={!ready}>
                저장 확인·재시도
              </Button>
              <Link href="/protected/books" className="text-caption text-accent underline">
                내 책장에서 확인
              </Link>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
