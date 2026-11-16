'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Button from '@/components/ui/Button';
import { Textarea } from '@/components/ui/Textarea';
import { useTopBar } from '@/components/shell/TopBarContext';
import { createDebate, type PickableEntry } from '@/lib/debate/client';
import type { Range } from '@/lib/debate/types';
import EntryPicker from './EntryPicker';
import UnderlinePen from './UnderlinePen';

interface NewDebateFlowProps {
  /** 기록 상세에서 "이 문장으로 토론 열기"로 왔을 때의 기록. 있으면 고르기 단계를 건너뛴다 */
  initialEntry: PickableEntry | null;
}

const QUESTION_MAX = 500;

/** 발제 세 단계: 기록 고르기 → 밑줄 긋기 → 질문 쓰기. 단계를 오가도 고른 것과 쓴 것은 남는다. */
export default function NewDebateFlow({ initialEntry }: NewDebateFlowProps) {
  const router = useRouter();
  useTopBar({ title: '발제하기', back: { href: '/social/talk', label: '토론' } });

  const [step, setStep] = useState<1 | 2 | 3>(initialEntry ? 2 : 1);
  const [entry, setEntry] = useState<PickableEntry | null>(initialEntry);
  const [underlines, setUnderlines] = useState<Range[]>([]);
  const [question, setQuestion] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  const pick = (e: PickableEntry) => {
    if (e.id !== entry?.id) setUnderlines([]);
    setEntry(e);
    setStep(2);
  };

  const submit = async () => {
    if (!entry || !question.trim() || sending) return;
    setSending(true);
    setError('');
    try {
      const { id } = await createDebate({
        entryId: entry.id,
        question: question.trim(),
        underlines,
      });
      router.replace(`/social/talk/${id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : '토론을 열지 못했어요.');
      setSending(false);
    }
  };

  const titles = {
    1: '토론할 문장을 골라요',
    2: '함께 볼 곳에 밑줄을 그어요',
    3: '친구들에게 물어요',
  } as const;

  return (
    <div className="mx-auto max-w-[640px] pb-16">
      <p className="font-sans text-overline text-ink-sub">{`발제 ${step}/3`}</p>
      <h1 className="mt-1 font-sans text-section-title text-ink">{titles[step]}</h1>

      <div className="mt-6">
        {step === 1 && (
          <EntryPicker
            selectedId={entry?.id}
            onPick={pick}
            privateNote="나만 보기 기록이에요. 이 문장은 기록과 따로 토론에 남아요"
          />
        )}

        {step === 2 && entry && (
          <>
            <UnderlinePen quote={entry.quote} value={underlines} onChange={setUnderlines} />
            <p className="mt-4 font-sans text-fine text-ink-faint">
              {entry.bookTitle}
              {entry.bookAuthor ? ` · ${entry.bookAuthor}` : ''} · 밑줄 없이 문장 전체로 물어도 돼요
            </p>
          </>
        )}

        {step === 3 && entry && (
          <>
            <p className="line-clamp-3 font-serif text-body text-ink-sub">{entry.quote}</p>
            <div className="mt-6">
              <Textarea
                id="debate-question"
                label="질문"
                variant="line"
                fullWidth
                rows={3}
                maxLength={QUESTION_MAX}
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="이 문장을 두고 친구들에게 묻고 싶은 것 하나"
                className="font-serif"
              />
            </div>
            <p
              className={
                entry.isPrivate
                  ? 'mt-4 font-sans text-caption font-semibold text-accent'
                  : 'mt-4 font-sans text-caption text-ink-sub'
              }
            >
              이 문장은 기록과 따로 토론에 남아요
            </p>
            <p className="mt-1 font-sans text-fine text-ink-faint">
              친구들이 읽고 답해요. 올린 뒤에는 밑줄을 고칠 수 없어요.
            </p>
            {error && (
              <p role="alert" className="mt-3 font-sans text-caption text-danger">
                {error}
              </p>
            )}
          </>
        )}
      </div>

      <div className="mt-8 flex gap-2">
        {step > 1 && (
          <Button
            variant="secondary"
            onClick={() => setStep((s) => (s - 1) as 1 | 2)}
            disabled={sending}
          >
            이전
          </Button>
        )}
        {step === 2 && (
          <Button className="ml-auto" onClick={() => setStep(3)}>
            다음
          </Button>
        )}
        {step === 3 && (
          <Button
            className="ml-auto"
            onClick={submit}
            disabled={!question.trim() || sending}
            loading={sending}
          >
            올리기
          </Button>
        )}
      </div>
    </div>
  );
}
