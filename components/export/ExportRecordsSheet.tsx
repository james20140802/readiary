'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import Button from '@/components/ui/Button';
import Chip from '@/components/ui/Chip';
import Sheet from '@/components/ui/Sheet';
import { apiFetch, SessionExpiredError } from '@/lib/api/fetch';
import { exportActions, type ExportAction } from '@/lib/export/exportActions';

export type ExportScope = { kind: 'book'; userBookId: string } | { kind: 'month' };

interface Props {
  open: boolean;
  onClose: () => void;
  scope: ExportScope;
}

type Load<T> = { status: 'loading' } | { status: 'error' } | { status: 'ready'; value: T };

interface ExportText {
  markdown: string;
  fileName: string;
  entryCount: number;
}

interface EntryMonth {
  month: string;
  entryCount: number;
}

const monthLabel = (month: string) => {
  const [y, m] = month.split('-').map(Number);
  return `${y}년 ${m}월`;
};

async function getJson<T>(url: string): Promise<T> {
  const response = await apiFetch(url, { cache: 'no-store' });
  if (!response.ok) throw new Error(`export ${response.status}`);
  return response.json() as Promise<T>;
}

/** 실패 문구 + 다시 시도 — 달 목록과 본문이 따로 쓴다 */
function Retry({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div role="alert" className="py-4 font-sans text-caption text-ink-sub">
      {message}{' '}
      <button
        type="button"
        onClick={onRetry}
        className="min-h-11 font-semibold text-accent hover:underline"
      >
        다시 시도
      </button>
    </div>
  );
}

const ACTION_LABEL: Record<ExportAction, string> = {
  share: '공유하기',
  copy: '복사하기',
  download: '파일로 저장',
};

/** 시트가 열려 있는 동안만 산다 — 닫으면 가져온 기록도 함께 버린다 */
function ExportBody({ scope }: { scope: ExportScope }) {
  const [months, setMonths] = useState<Load<EntryMonth[]>>({ status: 'loading' });
  const [month, setMonth] = useState<string | null>(null);
  const [text, setText] = useState<Load<ExportText> | null>(
    scope.kind === 'book' ? { status: 'loading' } : null
  );
  const [copyFailed, setCopyFailed] = useState(false);
  const [actions] = useState(() =>
    exportActions({
      canShare: typeof navigator.share === 'function',
      coarsePointer: window.matchMedia('(pointer: coarse)').matches,
    })
  );
  // 달을 빠르게 바꿔도 마지막으로 고른 달의 본문만 남긴다
  const textRequest = useRef(0);

  const loadMonths = useCallback(async () => {
    setMonths({ status: 'loading' });
    try {
      const { months: list } = await getJson<{ months: EntryMonth[] }>('/api/export/months');
      setMonths({ status: 'ready', value: list });
      setMonth((current) => current ?? list[0]?.month ?? null);
    } catch (error) {
      if (!(error instanceof SessionExpiredError)) setMonths({ status: 'error' });
    }
  }, []);

  const loadText = useCallback(async (url: string) => {
    const request = ++textRequest.current;
    setText({ status: 'loading' });
    setCopyFailed(false);
    try {
      const value = await getJson<ExportText>(url);
      if (request === textRequest.current) setText({ status: 'ready', value });
    } catch (error) {
      if (request === textRequest.current && !(error instanceof SessionExpiredError))
        setText({ status: 'error' });
    }
  }, []);

  const textUrl =
    scope.kind === 'book'
      ? `/api/export?book=${encodeURIComponent(scope.userBookId)}`
      : month
        ? `/api/export?month=${month}`
        : null;

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 시트가 열릴 때 한 번 가져온다
    if (scope.kind === 'month') void loadMonths();
  }, [scope.kind, loadMonths]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 고른 범위가 바뀔 때 가져온다
    if (textUrl) void loadText(textUrl);
  }, [textUrl, loadText]);

  const ready = text?.status === 'ready' ? text.value : null;

  const run = async (action: ExportAction) => {
    if (!ready) return;
    if (action === 'copy') {
      try {
        await navigator.clipboard.writeText(ready.markdown);
        setCopyFailed(false);
        toast.success('복사했어요');
      } catch {
        setCopyFailed(true);
      }
      return;
    }
    if (action === 'share') {
      try {
        await navigator.share({
          title: ready.markdown.split('\n', 1)[0].replace(/^# /, ''),
          text: ready.markdown,
        });
      } catch (error) {
        // 사용자가 공유 창을 닫은 것은 실패가 아니다
        if ((error as DOMException)?.name !== 'AbortError') toast.error('공유하지 못했어요.');
      }
      return;
    }
    const url = URL.createObjectURL(
      new Blob([ready.markdown], { type: 'text/markdown;charset=utf-8' })
    );
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = ready.fileName;
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
  };

  return (
    <div>
      <p className="font-sans text-caption leading-[1.5] text-ink-sub">
        {scope.kind === 'book' ? '이 책에' : '한 달 동안'} 남긴 문장과 생각을 AI나 메모 앱에 붙여
        넣을 수 있는 글로 꺼내요. 비공개 기록도 포함돼요.
      </p>

      {scope.kind === 'month' && (
        <div className="mt-4">
          {months.status === 'loading' && (
            <p role="status" className="py-2 font-sans text-caption text-ink-sub">
              기록이 있는 달을 찾는 중…
            </p>
          )}
          {months.status === 'error' && (
            <Retry message="기록이 있는 달을 불러오지 못했어요." onRetry={loadMonths} />
          )}
          {months.status === 'ready' &&
            (months.value.length === 0 ? (
              <p className="py-2 font-serif text-note text-ink-sub">
                아직 남긴 기록이 없어요. 기록을 남기면 달마다 꺼낼 수 있어요.
              </p>
            ) : (
              <div
                role="group"
                aria-label="꺼낼 달"
                className="-mx-[22px] flex gap-2 overflow-x-auto px-[22px] pb-1 [scrollbar-width:none]"
              >
                {months.value.map((m) => (
                  <Chip
                    key={m.month}
                    selected={m.month === month}
                    aria-pressed={m.month === month}
                    onClick={() => setMonth(m.month)}
                    className="flex-none"
                  >
                    {monthLabel(m.month)}
                  </Chip>
                ))}
              </div>
            ))}
        </div>
      )}

      {text?.status === 'loading' && (
        <p role="status" className="py-10 text-center font-sans text-caption text-ink-sub">
          기록을 엮는 중…
        </p>
      )}
      {text?.status === 'error' && textUrl && (
        <Retry message="기록을 불러오지 못했어요." onRetry={() => loadText(textUrl)} />
      )}
      {ready &&
        (ready.entryCount === 0 ? (
          <p className="mt-4 font-serif text-note text-ink-sub">아직 꺼낼 기록이 없어요.</p>
        ) : (
          <>
            <pre
              tabIndex={0}
              aria-label="꺼낼 글 미리보기"
              className="mt-4 max-h-[46dvh] select-text overflow-y-auto whitespace-pre-wrap break-words rounded-[6px] border border-hairline bg-paper p-4 font-sans text-[14px] leading-[1.7] text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
            >
              {ready.markdown}
            </pre>
            <div className="mt-[18px] flex gap-2">
              {actions.map((action, i) => (
                <Button
                  key={action}
                  variant={i === 0 ? 'primary' : 'secondary'}
                  className="flex-1"
                  onClick={() => run(action)}
                >
                  {ACTION_LABEL[action]}
                </Button>
              ))}
            </div>
            {copyFailed && (
              <p role="alert" className="mt-3 font-sans text-caption text-ink-sub">
                복사하지 못했어요. 미리보기의 글을 길게 누르거나 끌어서 직접 선택해 복사할 수
                있어요.
              </p>
            )}
          </>
        ))}
    </div>
  );
}

/** 기록 꺼내기 — 책 한 권 또는 한 달의 내 기록을 마크다운으로 미리 보고 공유·복사·저장한다 */
export default function ExportRecordsSheet({ open, onClose, scope }: Props) {
  return (
    <Sheet open={open} onClose={onClose} title="기록 꺼내기">
      {open && <ExportBody scope={scope} />}
    </Sheet>
  );
}
