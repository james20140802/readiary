'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import Button from '@/components/ui/Button';
import Sheet from '@/components/ui/Sheet';
import { useTopBar } from '@/components/shell/TopBarContext';
import { useActionLock } from '@/hooks/useActionLock';
import { apiFetch, SessionExpiredError } from '@/lib/api/fetch';
import { reconcilePicks, togglePick } from '@/lib/monthly-excerpt/compose';
import type { ComposePick } from '@/lib/monthly-excerpt/compose';
import { shareImpact } from '@/lib/monthly-excerpt/model';
import { shortMonthLabel } from '@/lib/monthly-excerpt/month';
import type { MonthBook, MonthKey } from '@/lib/monthly-excerpt/types';
import OrderStep from './OrderStep';
import PickStep from './PickStep';
import PreviewStep from './PreviewStep';
import type { ShareChoice } from './PreviewStep';
import { useCandidates, useMonthBooks } from './useComposeData';
import type { CandidatePage } from './useComposeData';
import { useLeaveGuard } from './useLeaveGuard';

type Step = 'pick' | 'order' | 'preview';

interface ComposeFlowProps {
  month: MonthKey;
  /** 서버가 불러오지 못했으면 null — 칩이 스스로 오류 상태에서 시작한다 */
  books: MonthBook[] | null;
  firstPage: CandidatePage | null;
  /** 이미 엮은 발췌집이 있으면 그 문장들 (고치기) */
  initialPicks: ComposePick[];
  /** 이미 엮은 권의 지금 공개 범위. 처음 엮을 때는 없다 */
  initialIsShared?: boolean;
}

const STEP_NO: Record<Step, string> = {
  pick: '1/3 고르기',
  order: '2/3 순서',
  preview: '3/3 미리보기',
};

/** 떠 있는 바 왼쪽의 되돌아가기·보기 전환 — 밑줄 링크 대신 바 안의 글자 버튼으로 눌림 영역을 둔다 */
const BAR_TEXT_BUTTON =
  'min-h-11 shrink-0 rounded-full px-3 font-sans text-button-sm font-semibold text-accent transition-[background-color,transform] duration-150 hover:bg-ink/5 active:scale-[0.97] disabled:text-ink-faint motion-reduce:active:scale-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent';

/** 저장 실패 응답. 문구가 없는 오류(500 등)는 화면의 fallback을 쓴다 */
interface SaveFailure {
  code?: string;
  error?: string;
  staleIds?: string[];
}

/**
 * 달의 발췌집 엮기 — 고르기 → 순서 → 미리보기를 한 화면의 단계로 둔다.
 * 단계를 오가도 고른 문장·순서·후보 목록 상태를 잃지 않도록 상태는 여기서 쥔다.
 * 단계 전환에 transform을 쓰지 않는다 — 미리보기의 펼친 페이지가 position:fixed 여백선을 쓰기 때문이다.
 */
export default function ComposeFlow({
  month,
  books,
  firstPage,
  initialPicks,
  initialIsShared,
}: ComposeFlowProps) {
  const label = shortMonthLabel(month);
  const editing = initialPicks.length > 0;
  useTopBar({
    title: `${label} 엮기`,
    back: { href: editing ? `/excerpts/${month}` : '/excerpts', label: '모아 보기' },
  });
  const router = useRouter();
  const lock = useActionLock();

  const [step, setStep] = useState<Step>('pick');
  const [picks, setPicks] = useState<ComposePick[]>(initialPicks);
  // 고치기는 이미 고른 문장을 먼저 보여 준다
  const [pickedView, setPickedView] = useState(initialPicks.length > 0);
  // 고치기는 지금의 공개 범위에서 시작한다. 처음 엮을 때는 기본값 없이 직접 고르게 한다
  const [share, setShare] = useState<ShareChoice | null>(
    initialIsShared === undefined ? null : initialIsShared ? 'friends' : 'private'
  );
  const [saved, setSaved] = useState(false);
  const list = useCandidates(month, firstPage);
  const chips = useMonthBooks(month, books);

  // 처음 고른 그대로면 잃을 것이 없다
  const dirty =
    !saved &&
    (picks.length !== initialPicks.length ||
      picks.some((p, i) => p.entryId !== initialPicks[i].entryId));
  const guard = useLeaveGuard(dirty, editing ? `/excerpts/${month}` : '/excerpts');

  // 단계가 바뀌면 키보드·낭독기 초점을 새 단계의 제목으로 옮긴다
  const heading = useRef<HTMLHeadingElement>(null);
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    window.scrollTo(0, 0);
    heading.current?.focus();
  }, [step]);

  const total = chips.books?.reduce((sum, b) => sum + b.quoteCount, 0) ?? null;
  // 공개 문장이 없어진 뒤에는 '친구에게 보여 주기'를 골랐던 것도 무효다
  const effectiveShare = share === 'friends' && shareImpact(picks).publicCount === 0 ? null : share;

  const toggle = (pick: ComposePick) => {
    const next = togglePick(picks, pick);
    setPicks(next);
    if (next.length === 0) setPickedView(false);
  };

  const save = async () => {
    if (!lock.acquire()) return;
    const fallback = '발췌집을 엮지 못했어요. 잠시 뒤 다시 시도해 주세요.';
    let done = false;
    try {
      const res = await apiFetch('/api/monthly-excerpts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          month,
          entryIds: picks.map((p) => p.entryId),
          isShared: effectiveShare === 'friends',
        }),
      });
      if (res.ok) {
        done = true;
        // 보초 항목을 먼저 걷어야 replace가 엮던 화면의 항목을 바꾼다 — 뒤로 가도 엮던 화면이 남지 않는다
        await guard.release();
        setSaved(true);
        toast.success('달의 발췌집을 엮었어요.');
        lock.navigate(`/excerpts/${month}`);
        router.replace(`/excerpts/${month}`);
        // 모아 보기의 달 줄이 옛 상태로 남지 않게 한다
        router.refresh();
        return;
      }
      const body = (await res.json().catch(() => null)) as SaveFailure | null;
      const message = typeof body?.error === 'string' && body.error ? body.error : fallback;
      if (res.status === 422 && body?.code === 'stale_entries') {
        // 사라진 기록만 빼고 순서를 지킨 채 고르기로 돌아가 후보를 새로 받는다
        const staleIds = Array.isArray(body.staleIds) ? body.staleIds : [];
        setPicks(reconcilePicks(picks, staleIds));
        setPickedView(false);
        setStep('pick');
        list.reload();
        void chips.reload();
      }
      toast.error(message);
    } catch (error) {
      if (!(error instanceof SessionExpiredError)) toast.error(fallback);
    } finally {
      if (!done) lock.release();
    }
  };

  const wide = step === 'preview';
  const title = {
    pick: total !== null ? `${label}의 문장 ${total}개` : `${label}의 문장`,
    order: '어떤 순서로 읽을까요',
    preview: '이렇게 엮어요',
  }[step];
  const caption = {
    pick: '다시 읽고 싶은 문장만 골라 주세요',
    order: '친구에게 보이는 첫 문장이 피드의 표지가 돼요',
    preview: '묶음을 넘겨 보고, 한 페이지로도 펼쳐 보세요',
  }[step];

  return (
    <div className={`mx-auto w-full pb-28 lg:pb-32 ${wide ? 'max-w-[960px]' : 'max-w-[640px]'}`}>
      <div className="flex items-baseline justify-between gap-3 font-sans text-caption">
        <span className="font-semibold text-ink">{label} 엮기</span>
        <span className="text-ink-sub">{STEP_NO[step]}</span>
      </div>
      <h2
        ref={heading}
        tabIndex={-1}
        className="mt-3 break-keep font-serif text-[20px] font-bold leading-[1.4] text-ink outline-none"
      >
        {title}
      </h2>
      <p className="mb-3 mt-0.5 font-sans text-caption text-ink-sub">{caption}</p>

      {step === 'pick' && (
        <PickStep
          list={list}
          chips={chips}
          picks={picks}
          onToggle={toggle}
          pickedView={pickedView}
        />
      )}
      {step === 'order' && <OrderStep picks={picks} onChange={setPicks} />}
      {step === 'preview' && (
        <PreviewStep
          month={month}
          picks={picks}
          share={effectiveShare}
          onShare={setShare}
          disabled={lock.busy}
        />
      )}

      {/* 탭 바와 같은 재질로 떠 있는 행동 바. 모바일은 탭 바 바로 위, 넓은 화면은 본문 칸 아래에 뜬다 */}
      <div className="pointer-events-none fixed inset-x-4 bottom-[calc(var(--app-mobile-nav-height)+8px)] z-20 lg:bottom-6 lg:left-[var(--app-side)] lg:right-0 lg:pl-20 lg:pr-14">
        <div
          className={`bar-material tabbar-glass pointer-events-auto mx-auto flex min-h-[60px] w-full items-center justify-between gap-2 rounded-[32px] py-1.5 pl-2 pr-1.5 ${wide ? 'max-w-[960px]' : 'max-w-[640px]'}`}
        >
          {step === 'pick' && (
            <>
              {picks.length === 0 ? (
                <span className="px-3 font-sans text-button-sm text-ink-sub">
                  문장을 골라 주세요
                </span>
              ) : (
                <button
                  type="button"
                  aria-pressed={pickedView}
                  onClick={() => setPickedView((v) => !v)}
                  className={BAR_TEXT_BUTTON}
                >
                  {pickedView ? '전체 문장 보기' : `고른 문장 ${picks.length}`}
                </button>
              )}
              <Button disabled={picks.length === 0} onClick={() => setStep('order')}>
                순서 정하기
              </Button>
            </>
          )}
          {step === 'order' && (
            <>
              <button type="button" onClick={() => setStep('pick')} className={BAR_TEXT_BUTTON}>
                문장 다시 고르기
              </button>
              <Button onClick={() => setStep('preview')}>미리보기</Button>
            </>
          )}
          {step === 'preview' && (
            <>
              <button
                type="button"
                disabled={lock.busy}
                onClick={() => setStep('order')}
                className={BAR_TEXT_BUTTON}
              >
                순서 정하기
              </button>
              <span className="flex min-w-0 items-center gap-2">
                {effectiveShare === null && (
                  <span className="min-w-0 text-right font-sans text-fine leading-tight text-ink-sub">
                    공개 범위를 골라 주세요
                  </span>
                )}
                <Button
                  disabled={lock.busy || effectiveShare === null}
                  loading={lock.busy}
                  onClick={() => void save()}
                >
                  엮기
                </Button>
              </span>
            </>
          )}
        </div>
      </div>

      <Sheet open={guard.pending !== null} onClose={guard.stay} title="고른 문장이 사라져요">
        <p className="font-sans text-body text-ink-sub">
          지금 나가면 고른 문장과 순서가 저장되지 않아요.
        </p>
        <div className="mt-[18px] flex gap-2">
          <Button variant="secondary" className="flex-1" onClick={guard.stay}>
            계속 고르기
          </Button>
          <Button variant="danger" className="flex-1" onClick={() => void guard.leave()}>
            나가기
          </Button>
        </div>
      </Sheet>
    </div>
  );
}
