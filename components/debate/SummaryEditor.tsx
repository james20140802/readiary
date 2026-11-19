'use client';

import { useState } from 'react';
import clsx from 'clsx';
import { toast } from 'sonner';
import Button from '@/components/ui/Button';
import Sheet from '@/components/ui/Sheet';
import { Textarea } from '@/components/ui/Textarea';
import { saveSummary } from '@/lib/debate/client';
import type { DebateAnswer, DebateDetail } from '@/lib/debate/types';

interface Props {
  open: boolean;
  onClose(): void;
  debate: DebateDetail;
  onSaved(): void;
}

const MAX_PINS = 2;

/** 발제자의 정리 — 본문과, 도움이 된 답을 2개까지 짚는다. 처음 정리하면 토론이 닫힌다 */
export default function SummaryEditor({ open, onClose, debate, onSaved }: Props) {
  const [body, setBody] = useState(debate.summary?.body ?? '');
  const [pins, setPins] = useState<string[]>(
    debate.summary?.pins.filter((p) => !p.deleted).map((p) => p.answerId) ?? []
  );
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  // 짚을 수 있는 답: 단락마다 보이는 대표 답(지우지 않은 것)
  const candidates: DebateAnswer[] = [];
  for (const s of debate.sections) {
    for (const a of s.picks)
      if (!a.deleted && a.author.active && !candidates.some((c) => c.id === a.id))
        candidates.push(a);
  }

  const toggle = (id: string) =>
    setPins((p) =>
      p.includes(id) ? p.filter((x) => x !== id) : p.length < MAX_PINS ? [...p, id] : p
    );

  const save = async () => {
    if (!body.trim()) return;
    setSending(true);
    setError('');
    try {
      await saveSummary(debate.id, { body: body.trim(), pins });
      toast(debate.closedAt ? '정리를 고쳤어요' : '정리해서 닫았어요');
      onSaved();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : '정리를 남기지 못했어요.');
    } finally {
      setSending(false);
    }
  };

  return (
    <Sheet open={open} onClose={onClose} title={debate.closedAt ? '정리 고치기' : '정리하기'}>
      {!debate.closedAt && (
        <p className="font-sans text-caption text-ink-sub">
          정리하면 토론이 닫혀요. 새 답은 받지 않고, 읽기와 “생각이 바뀌었어요”는 계속돼요.
        </p>
      )}
      <div className="mt-3">
        <Textarea
          autoGrow
          aria-label="정리"
          variant="line"
          fullWidth
          rows={4}
          maxLength={2000}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="이야기가 어디로 모였는지 남겨 주세요"
          className="font-serif"
        />
      </div>
      {candidates.length > 0 && (
        <fieldset className="mt-4">
          <legend className="font-sans text-caption text-ink-sub">
            도움이 된 답 짚기 · 2개까지
          </legend>
          <ul className="mt-1">
            {candidates.map((a) => {
              const on = pins.includes(a.id);
              return (
                <li key={a.id}>
                  <button
                    type="button"
                    aria-pressed={on}
                    disabled={!on && pins.length >= MAX_PINS}
                    onClick={() => toggle(a.id)}
                    className={clsx(
                      'block w-full border-b border-hairline py-2.5 text-left disabled:opacity-50',
                      on && 'bg-accent/[0.07]'
                    )}
                  >
                    <span className="font-sans text-fine font-semibold text-ink-sub">
                      {a.author.isMe ? '나' : a.author.nickname}
                    </span>
                    <span className="line-clamp-2 font-serif text-body-sm text-ink">{a.body}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </fieldset>
      )}
      {error && (
        <p role="alert" className="mt-2 font-sans text-caption text-danger">
          {error}
        </p>
      )}
      <Button
        fullWidth
        className="mt-4"
        onClick={save}
        disabled={!body.trim() || sending}
        loading={sending}
      >
        {debate.closedAt ? '정리 고치기' : '정리하고 닫기'}
      </Button>
    </Sheet>
  );
}
