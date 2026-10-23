'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { apiFetch } from '@/lib/api/fetch';
import { clearSubmittedComposerDraft } from '@/lib/entries/composerDraft';
import { useComposerDraft } from '@/hooks/useComposerDraft';
import type { MyBook } from '@/types/book';
import ComposerView, { type ComposerMode, type ComposerSaved } from './ComposerView';

interface ComposerProps {
  userId: string;
  books: MyBook[];
  recentUserBookId: string | null;
  desk?: boolean;
}

/**
 * 오늘 장의 쓰기 — 초안 보관(탭 단위 sessionStorage)·멱등 저장(client_entry_id)·남긴 뒤 덧붙이기는
 * 옛 홈 Composer와 같다. 모양은 ComposerView가 맡는다.
 */
export default function Composer({ userId, books, recentUserBookId, desk }: ComposerProps) {
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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submitLock = useRef(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const locked = isSubmitting || Boolean(draft.submission);
  const [saved, setSaved] = useState<Omit<ComposerSaved, 'extraOpen' | 'extraText'> | null>(null);
  const [extraOpen, setExtraOpen] = useState(false);
  const [extraText, setExtraText] = useState('');
  const selectedBook = books.find((b) => b.id === selectedId) ?? null;

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
      const savedMode: ComposerMode = submitted.quote.trim() ? 'quote' : 'note';
      setSaved({
        id: data.id,
        mode: savedMode,
        text: submitted.quote.trim() || submitted.note.trim(),
        bookTitle: submission.bookTitle,
      });
      // 문장과 생각을 함께 남겼다면 덧붙일 칸에 그 생각을 미리 보여 준다(옛 동작 그대로)
      setExtraText(savedMode === 'quote' ? submitted.note : '');
      setExtraOpen(Boolean(submitted.quote.trim() && submitted.note.trim()));
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
    setSaved(null);
    setSaveError(null);
    setExtraOpen(false);
    setExtraText('');
    update({ mode: 'quote' });
  };

  /** 남긴 기록에 덧붙이기 — 생각(또는 문장)과 읽은 쪽. 성공하면 처음 쓰기로 돌아간다 */
  const patchSaved = async (pages: { from: string; to: string } | null): Promise<boolean> => {
    if (!saved || isSubmitting) return false;
    if (pages && pages.from !== '' && pages.to !== '' && Number(pages.from) > Number(pages.to)) {
      toast.error('시작 쪽은 끝 쪽보다 작거나 같아야 해요.');
      return false;
    }
    const body: Record<string, unknown> = {};
    if (extraOpen && extraText.trim() !== '') {
      body[saved.mode === 'quote' ? 'note' : 'quote'] = extraText.trim();
    }
    if (pages && (pages.from !== '' || pages.to !== '')) {
      body.from_page = pages.from === '' ? null : Number(pages.from);
      body.to_page = pages.to === '' ? null : Number(pages.to);
    }
    if (Object.keys(body).length === 0) {
      resetAll();
      return true;
    }
    setIsSubmitting(true);
    try {
      const res = await apiFetch(`/api/entries/${saved.id}/edit`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        toast.error(data?.error ?? '덧붙이기에 실패했어요.');
        return false;
      }
      toast.success('기록에 덧붙였어요.');
      resetAll();
      router.refresh();
      return true;
    } catch {
      toast.error('서버와 통신 중 오류가 발생했습니다.');
      return false;
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ComposerView
      desk={desk}
      books={books}
      selectedId={selectedId}
      mode={mode}
      quote={draft.quote}
      note={draft.note}
      isPrivate={isPrivate}
      ready={ready}
      disabled={!ready || locked}
      canSave={ready && !!selectedBook && Boolean(draft.quote.trim() || draft.note.trim())}
      pendingSubmission={Boolean(draft.submission)}
      submitting={isSubmitting}
      draftKept={ready && Boolean(draft.quote || draft.note)}
      storageError={storageError}
      saveError={saveError}
      saved={saved && ready ? { ...saved, extraOpen, extraText } : null}
      onChange={(field, value) => update({ [field]: value })}
      onMode={(m) => update({ mode: m })}
      onTogglePrivate={() => update({ isPrivate: !isPrivate })}
      onSelectBook={(id) => update({ selectedId: id })}
      onSave={handleSave}
      onExtraOpen={() => setExtraOpen(true)}
      onExtraChange={setExtraText}
      onAddExtra={() => void patchSaved(null)}
      onAddPages={(from, to) => patchSaved({ from, to })}
      onAgain={resetAll}
    />
  );
}
