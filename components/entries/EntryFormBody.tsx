'use client';
import EntryRepublishWarning from '@/components/reflections/EntryRepublishWarning';
import ActionNavigation from '@/components/ui/ActionNavigation';

import {
  UncertainMutationError,
  ReflectionConfirmationRequiredError,
} from '@/lib/actions/updateEntry';
import { SessionExpiredError } from '@/lib/api/fetch';
import { useId, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import { useActionLock } from '@/hooks/useActionLock';
import { todayKST } from '@/lib/dates';
import { hasEntryContent } from '@/lib/entries/validation';
import Button from '@/components/ui/Button';
import Switch from './Switch';
import { FIELD_LABEL, LONG_FIELD, SHORT_FIELD } from './fieldStyles';

export interface EntryFormValues {
  reflection_count?: number | null;
  quote: string | null;
  note: string | null;
  from_page: number | null;
  to_page: number | null;
  date: string;
  is_private: boolean;
}

export type EntryFormInitial = Partial<{
  quote: string;
  note: string;
  fromPage: number | null;
  toPage: number | null;
  date: string;
  isPrivate: boolean;
}>;

interface EntryFormBodyProps {
  entryId?: string;
  /** 종료 페이지 상한 — 책의 총 쪽수 */
  totalPages?: number | null;
  submitLabel: string;
  initial?: EntryFormInitial;
  onSubmit: (values: EntryFormValues) => Promise<string | null>;
  /** 시트처럼 열리자마자 쓰기 시작하는 자리에서 첫 칸에 포커스 */
  autoFocus?: boolean;
  /** 컨트롤 행 왼쪽에 끼워 넣는 조용한 부가 동작 (예: 삭제) */
  secondaryAction?: React.ReactNode;
  onBusyChange?: (busy: boolean) => void;
  disabled?: boolean;
  frozen?: boolean;
  retainOnSuccess?: boolean;
  successHref?: string;
}

/**
 * 기록 폼의 알맹이 — 문장·생각 두 장, 쪽수·날짜·공개 여부 컨트롤 한 줄, 저장 버튼.
 * 페이지(EntryForm)와 바텀시트(EntryEditSheet)가 같이 쓴다. 문장·생각 중 하나만 있으면 저장,
 * 날짜 백필 허용, 페이지 선택.
 */
export default function EntryFormBody({
  entryId,
  totalPages,
  submitLabel,
  initial,
  onSubmit,
  autoFocus = false,
  secondaryAction,
  onBusyChange,
  disabled = false,
  frozen = false,
  retainOnSuccess = false,
  successHref,
}: EntryFormBodyProps) {
  const [quote, setQuote] = useState(initial?.quote ?? '');
  const [note, setNote] = useState(initial?.note ?? '');
  const [fromPage, setFromPage] = useState(initial?.fromPage?.toString() ?? '');
  const [toPage, setToPage] = useState(initial?.toPage?.toString() ?? '');
  const [date, setDate] = useState(initial?.date ?? todayKST());
  const [isPrivate, setIsPrivate] = useState(initial?.isPrivate ?? false);
  const [acknowledgePublic, setAcknowledgePublic] = useState<number | null>(null);
  const [serverRequiresConfirmation, setServerRequiresConfirmation] = useState(false);
  const [confirmationAttempt, setConfirmationAttempt] = useState(0);
  const republishing =
    !!entryId && (initial?.isPrivate === true || serverRequiresConfirmation) && !isPrivate;
  const errorId = useId();
  const privateId = useId();
  const privateHelpId = useId();
  const quoteRef = useRef<HTMLTextAreaElement>(null);
  const [contentError, setContentError] = useState(false);
  const [error, setError] = useState('');
  const [needsReload, setNeedsReload] = useState(false);
  const action = useActionLock();
  const isSubmitting = action.busy;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (disabled || action.isLocked()) return;
    if (republishing && acknowledgePublic === null) {
      setError('함께 공개되는 생각을 확인해 주세요.');
      return;
    }
    setError('');
    setContentError(false);

    if (!hasEntryContent(quote, note)) {
      flushSync(() => {
        setContentError(true);
        setError('문장이나 생각 중 하나는 남겨주세요.');
      });
      quoteRef.current?.focus();
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

    if (!action.acquire()) return;
    onBusyChange?.(true);
    let succeeded = false;
    let leaving = false;
    try {
      const message = await onSubmit({
        quote: quote.trim() === '' ? null : quote.trim(),
        note: note.trim() === '' ? null : note.trim(),
        from_page: fromPage === '' ? null : Number(fromPage),
        to_page: toPage === '' ? null : Number(toPage),
        date,
        is_private: isPrivate,
        reflection_count: acknowledgePublic,
      });
      if (message) setError(message);
      else {
        succeeded = true;
        if (successHref) action.navigate(successHref);
      }
    } catch (error) {
      if (error instanceof SessionExpiredError) leaving = true;
      else if (error instanceof ReflectionConfirmationRequiredError) {
        setServerRequiresConfirmation(true);
        setAcknowledgePublic(null);
        setConfirmationAttempt((v) => v + 1);
        setError(error.message);
      } else if (error instanceof UncertainMutationError) {
        leaving = true;
        setNeedsReload(true);
        setError(error.message);
      } else setError(error instanceof Error ? error.message : '저장 결과를 확인하지 못했어요.');
    } finally {
      if (!leaving && (!succeeded || !retainOnSuccess)) {
        action.release();
        onBusyChange?.(false);
      }
    }
  };

  const locked = isSubmitting || disabled || frozen;
  // 시안 문법 — 긴 칸 둘(문장·생각)은 왼쪽 짧은 선, 쪽·날짜는 밑줄 칸, 공개 여부는 스위치 한 줄, 저장은 먹 버튼.
  return (
    <form onSubmit={handleSubmit} aria-busy={isSubmitting}>
      <div className="space-y-[18px] pt-[18px]">
        <div>
          <label htmlFor="entry-quote" className={FIELD_LABEL}>
            문장
          </label>
          <textarea
            disabled={locked}
            id="entry-quote"
            ref={quoteRef}
            aria-invalid={contentError || undefined}
            aria-describedby={contentError ? errorId : undefined}
            value={quote}
            onChange={(e) => {
              setQuote(e.target.value);
              if (contentError && hasEntryContent(e.target.value, note)) {
                setContentError(false);
                setError('');
              }
            }}
            placeholder="책에서 마음에 남은 문장을 옮겨 적어 보세요"
            rows={4}
            autoFocus={autoFocus}
            className={`${LONG_FIELD} font-semibold`}
          />
        </div>
        <div>
          <label htmlFor="entry-note" className={FIELD_LABEL}>
            생각
          </label>
          <textarea
            disabled={locked}
            id="entry-note"
            aria-invalid={contentError || undefined}
            aria-describedby={contentError ? errorId : undefined}
            value={note}
            onChange={(e) => {
              setNote(e.target.value);
              if (contentError && hasEntryContent(e.target.value, quote)) {
                setContentError(false);
                setError('');
              }
            }}
            placeholder="이 문장에 대한 나의 생각"
            rows={3}
            className={LONG_FIELD}
          />
        </div>
      </div>

      {/* 쪽·날짜 — 쪽은 없어도 남길 수 있다 */}
      <div className="mt-5 flex flex-wrap items-center justify-between gap-x-6 gap-y-2 font-sans text-[16px] font-medium text-ink-sub">
        <div className="flex items-center gap-1.5">
          <span aria-hidden>쪽</span>
          <input
            disabled={locked}
            type="number"
            inputMode="numeric"
            aria-label="시작 페이지"
            placeholder="10"
            value={fromPage}
            onChange={(e) => setFromPage(e.target.value)}
            className={`${SHORT_FIELD} w-14`}
          />
          <span aria-hidden className="text-ink-faint">
            –
          </span>
          <input
            disabled={locked}
            type="number"
            inputMode="numeric"
            aria-label="종료 페이지"
            placeholder="25"
            value={toPage}
            max={totalPages ?? undefined}
            onChange={(e) => setToPage(e.target.value)}
            className={`${SHORT_FIELD} w-14`}
          />
        </div>
        <input
          disabled={locked}
          type="date"
          aria-label="읽은 날짜"
          value={date}
          max={todayKST()}
          onChange={(e) => setDate(e.target.value)}
          className={`${SHORT_FIELD} min-w-0 px-1 text-[16px]`}
        />
      </div>

      <div className="mt-4 flex min-h-[54px] items-center gap-3 border-y border-hairline font-sans text-[17px] font-medium text-ink">
        <span id={privateId}>나만 보기</span>
        <Switch
          checked={isPrivate}
          labelledBy={privateId}
          describedBy={privateHelpId}
          disabled={locked}
          onChange={() => {
            setIsPrivate((v) => !v);
            setAcknowledgePublic(null);
          }}
        />
      </div>
      <p id={privateHelpId} className="mt-2 font-sans text-caption text-ink-sub">
        {isPrivate
          ? '나만 볼 수 있어요. 열려 있던 공유 링크도 닫혀요.'
          : '친구가 볼 수 있어요. 공유하기를 누르면 링크로도 열려요.'}
      </p>
      {republishing && entryId && (
        <EntryRepublishWarning
          key={confirmationAttempt}
          entryId={entryId}
          onReady={setAcknowledgePublic}
        />
      )}
      {error && (
        <p
          id={errorId}
          role={contentError ? undefined : 'alert'}
          className="mt-3 font-sans text-caption font-medium text-danger"
        >
          {error}
        </p>
      )}
      {needsReload && (
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="mt-2 min-h-11 font-sans text-button-sm text-accent"
        >
          새로고침해 기록 확인
        </button>
      )}

      <div className="mt-[18px] flex items-center gap-4">
        {secondaryAction}
        <Button
          type="submit"
          className="flex-1 sm:ml-auto sm:max-w-60"
          disabled={isSubmitting || disabled || (republishing && acknowledgePublic === null)}
        >
          {isSubmitting ? '남기는 중...' : submitLabel}
        </Button>
      </div>
      <ActionNavigation href={action.destination} />
    </form>
  );
}
