'use client';

import { useEffect, useRef, useState } from 'react';
import clsx from 'clsx';
import { X } from 'lucide-react';
import Button from '@/components/ui/Button';
import { Textarea } from '@/components/ui/Textarea';
import { editAnswer, postAnswer, postReply, type PickableEntry } from '@/lib/debate/client';
import { clearDraft, loadDraft, saveDraft, type DraftTarget } from '@/lib/debate/draft';
import { STANCES, STANCE_LABEL, type DebateAnswer, type Stance } from '@/lib/debate/types';
import { STANCE_ICON } from './StanceMark';
import EntryPicker from './EntryPicker';

export type ComposerTarget =
  | { kind: 'answer'; position: number | null; label: string; prompt?: string | null }
  | { kind: 'reply'; answerId: string }
  | { kind: 'edit'; answer: DebateAnswer };

interface AnswerComposerProps {
  debateId: string;
  target: ComposerTarget;
  onDone(): void;
  onCancel(): void;
}

const BODY_MAX = 2000;

/**
 * 답 쓰기 — 입장 고르기·입력칸·근거 기록 붙이기를 한 부품에. 휴대폰은 시트, 넓은 화면은 단락 안에 담긴다(ComposerHost).
 * 새 답과 답글은 이 기기에 초안으로 남고, 남기면 지운다. 고치기는 초안을 쓰지 않는다.
 */
export default function AnswerComposer({
  debateId,
  target,
  onDone,
  onCancel,
}: AnswerComposerProps) {
  const draftTarget: DraftTarget | null =
    target.kind === 'answer'
      ? { kind: 'answer', position: target.position }
      : target.kind === 'reply'
        ? { kind: 'reply', answerId: target.answerId }
        : null;
  const isReply =
    target.kind === 'reply' || (target.kind === 'edit' && target.answer.stance === null);

  const initial = draftTarget ? loadDraft(debateId, draftTarget) : null;
  const [stance, setStance] = useState<Stance | null>(
    target.kind === 'edit' ? target.answer.stance : (initial?.stance ?? null)
  );
  const [body, setBody] = useState(
    target.kind === 'edit' ? (target.answer.body ?? '') : (initial?.body ?? '')
  );
  const [evidence, setEvidence] = useState<PickableEntry | null>(initial?.evidence ?? null);
  const [picking, setPicking] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const textRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    textRef.current?.focus({ preventScroll: true });
  }, []);

  // 쓰는 대로 초안을 남긴다
  useEffect(() => {
    if (draftTarget) saveDraft(debateId, draftTarget, { stance, body, evidence });
    // draftTarget은 target에서 매번 새로 만든다 — 값이 같으므로 target만 본다
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debateId, target, stance, body, evidence]);

  const ready = body.trim().length > 0 && (isReply || stance !== null) && !sending;

  const send = async () => {
    if (!ready) return;
    setSending(true);
    setError('');
    try {
      if (target.kind === 'answer') {
        await postAnswer(debateId, {
          underline: target.position,
          stance: stance as Stance,
          body: body.trim(),
          evidenceEntryId: evidence?.id ?? null,
        });
      } else if (target.kind === 'reply') {
        await postReply(target.answerId, body.trim());
      } else {
        await editAnswer(target.answer.id, { stance: isReply ? null : stance, body: body.trim() });
      }
      if (draftTarget) clearDraft(debateId, draftTarget);
      onDone();
    } catch (e) {
      setError(e instanceof Error ? e.message : '남기지 못했어요. 잠시 후 다시 시도해 주세요.');
      setSending(false);
    }
  };

  const fieldLabel = isReply ? '답글' : '내 답';

  return (
    <div>
      {target.kind === 'answer' && target.prompt && (
        <p className="mb-2 border-l-2 border-accent pl-2.5 font-serif text-body text-ink">
          {target.prompt}
        </p>
      )}
      {target.kind === 'answer' && (
        <p className="font-sans text-caption text-ink-sub">
          {target.position === null
            ? '이 문장을 어떻게 읽었나요'
            : `‘${target.label}’을 어떻게 읽었나요`}
        </p>
      )}

      {!isReply && (
        <div
          role="radiogroup"
          aria-label="어떻게 읽었나요"
          className="mt-2.5 flex flex-wrap gap-1.5"
        >
          {STANCES.map((s) => {
            const Icon = STANCE_ICON[s];
            const on = stance === s;
            return (
              <button
                key={s}
                type="button"
                role="radio"
                aria-checked={on}
                onClick={() => setStance(s)}
                className={clsx(
                  'inline-flex min-h-10 items-center gap-1.5 rounded-full px-3.5 font-sans text-button-sm transition-colors duration-150 active:scale-[0.97]',
                  on
                    ? 'bg-ink text-ink-invert'
                    : 'border border-hairline-strong text-ink-sub hover:text-ink'
                )}
              >
                <Icon size={14} strokeWidth={1.75} aria-hidden />
                {STANCE_LABEL[s]}
              </button>
            );
          })}
        </div>
      )}

      <div className="mt-3">
        <Textarea
          ref={textRef}
          aria-label={fieldLabel}
          variant="line"
          fullWidth
          rows={isReply ? 2 : 4}
          maxLength={BODY_MAX}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder={isReply ? '짧게 이어 말해요' : '근거와 함께 남겨 주세요'}
          className="font-serif"
        />
      </div>

      {target.kind === 'answer' && evidence && (
        <div className="mt-3 flex items-start gap-2 border-l-2 border-hairline-strong pl-3">
          <div className="min-w-0 flex-1">
            <p className="line-clamp-2 font-serif text-body-sm text-ink">{evidence.quote}</p>
            <p className="mt-0.5 font-sans text-fine text-ink-faint">
              내 기록 · {evidence.bookTitle}
              {evidence.isPrivate && ' · 이 문장은 토론에 함께 남아요'}
            </p>
          </div>
          <button
            type="button"
            aria-label="붙인 기록 빼기"
            onClick={() => setEvidence(null)}
            className="grid h-10 w-10 place-items-center text-ink-sub"
          >
            <X size={18} strokeWidth={1.75} aria-hidden />
          </button>
        </div>
      )}

      {target.kind === 'answer' && picking && (
        <div className="mt-3 max-h-[40vh] overflow-auto">
          <EntryPicker
            selectedId={evidence?.id}
            privateNote="이 문장은 토론에 함께 남아요"
            onPick={(e) => {
              setEvidence(e);
              setPicking(false);
            }}
          />
        </div>
      )}

      {error && (
        <p role="alert" className="mt-3 font-sans text-caption text-danger">
          {error}
        </p>
      )}

      <div className="mt-4 flex items-center gap-2">
        {target.kind === 'answer' && !evidence && (
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setPicking((v) => !v)}
            aria-expanded={picking}
          >
            내 기록 붙이기
          </Button>
        )}
        <Button variant="ghost" size="sm" onClick={onCancel} disabled={sending}>
          취소
        </Button>
        <Button size="sm" className="ml-auto" onClick={send} disabled={!ready} loading={sending}>
          남기기
        </Button>
      </div>
    </div>
  );
}
