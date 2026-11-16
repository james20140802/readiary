'use client';

import { useState } from 'react';
import clsx from 'clsx';
import { toast } from 'sonner';
import Button from '@/components/ui/Button';
import Sheet from '@/components/ui/Sheet';
import { Textarea } from '@/components/ui/Textarea';
import { report } from '@/lib/debate/client';
import { REPORT_REASON_LABEL, type ReportReason } from '@/lib/debate/types';

interface Props {
  open: boolean;
  onClose(): void;
  debateId: string;
  /** 없으면 토론 자체를 신고한다 */
  answerId: string | null;
}

const REASONS = Object.keys(REPORT_REASON_LABEL) as ReportReason[];

/** 신고 — 사유 하나와 선택 메모. 운영자가 확인하고, 신고한 사람의 화면에서는 그 답이 접힌다 */
export default function ReportSheet({ open, onClose, debateId, answerId }: Props) {
  const [reason, setReason] = useState<ReportReason | null>(null);
  const [memo, setMemo] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  const send = async () => {
    if (!reason) return;
    setSending(true);
    setError('');
    try {
      await report(debateId, { answerId, reason, memo: memo.trim() || null });
      toast('신고를 받았어요. 운영자가 확인할게요.');
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : '신고를 보내지 못했어요.');
    } finally {
      setSending(false);
    }
  };

  return (
    <Sheet open={open} onClose={onClose} title={answerId ? '이 답 신고하기' : '이 토론 신고하기'}>
      <div role="radiogroup" aria-label="신고 사유" className="flex flex-col">
        {REASONS.map((r) => (
          <button
            key={r}
            type="button"
            role="radio"
            aria-checked={reason === r}
            onClick={() => setReason(r)}
            className={clsx(
              'flex min-h-12 items-center border-b border-hairline px-1 text-left font-sans text-body',
              reason === r ? 'font-semibold text-ink' : 'text-ink-sub'
            )}
          >
            <span
              aria-hidden
              className={clsx(
                'mr-3 h-4 w-4 rounded-full border',
                reason === r ? 'border-[5px] border-ink' : 'border-hairline-strong'
              )}
            />
            {REPORT_REASON_LABEL[r]}
          </button>
        ))}
      </div>
      <div className="mt-4">
        <Textarea
          aria-label="덧붙일 말(선택)"
          variant="line"
          fullWidth
          rows={2}
          maxLength={500}
          value={memo}
          onChange={(e) => setMemo(e.target.value)}
          placeholder="덧붙일 말(선택)"
        />
      </div>
      {error && (
        <p role="alert" className="mt-2 font-sans text-caption text-danger">
          {error}
        </p>
      )}
      <Button
        fullWidth
        className="mt-4"
        onClick={send}
        disabled={!reason || sending}
        loading={sending}
      >
        신고 보내기
      </Button>
    </Sheet>
  );
}
