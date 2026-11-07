'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import clsx from 'clsx';
import { Lock, LockOpen, Share } from 'lucide-react';
import { toast } from 'sonner';
import Button from '@/components/ui/Button';
import Sheet from '@/components/ui/Sheet';
import { TopBarActions, useTopBar } from '@/components/shell/TopBarContext';
import { useActionLock } from '@/hooks/useActionLock';
import { apiFetch, SessionExpiredError } from '@/lib/api/fetch';
import { NO_PUBLIC_QUOTES, shareImpact } from '@/lib/monthly-excerpt/model';
import type { MonthlyExcerpt, MonthlyExcerptReactionCounts } from '@/lib/monthly-excerpt/types';
import MonthlyExcerptExport from './MonthlyExcerptExport';
import MonthlyExcerptReactions from './MonthlyExcerptReactions';
import MonthlyExcerptReader from './MonthlyExcerptReader';

const ICON_BUTTON = 'relative grid h-11 w-11 place-items-center rounded-full text-ink';

/** 응답 본문의 사용자 문구. API가 문구를 주지 않은 오류는 fallback으로 */
async function failureMessage(res: Response, fallback: string): Promise<string> {
  const body = (await res.json().catch(() => null)) as { error?: unknown } | null;
  return typeof body?.error === 'string' && body.error ? body.error : fallback;
}

/** 내 달의 발췌집 — 읽기 화면에 상단 바와 소유자 동작(내보내기·고치기·공개 전환·지우기)을 얹는다 */
export default function MonthlyExcerptOwnerView({
  excerpt,
  reactions,
  currentUserId,
}: {
  excerpt: MonthlyExcerpt;
  /** 반응의 첫 수. 읽지 못했으면 null, 자리용 화면처럼 그리지 않을 때는 생략한다 */
  reactions?: MonthlyExcerptReactionCounts | null;
  currentUserId?: string;
}) {
  const { id, month, items, isShared } = excerpt;
  useTopBar({ title: '달의 발췌집', back: { href: '/excerpts', label: '모아 보기' } });
  const router = useRouter();
  const lock = useActionLock();
  const [exportOpen, setExportOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);

  const impact = shareImpact(
    items.map((item) => ({
      entryId: item.entryId,
      quote: item.quote,
      date: item.date,
      bookTitle: item.book.title,
      isPrivate: Boolean(item.isPrivate),
      hasNote: Boolean(item.note),
    }))
  );

  const setShared = async (next: boolean) => {
    if (!lock.acquire()) return;
    const fallback = '공개 범위를 바꾸지 못했어요. 잠시 뒤 다시 시도해 주세요.';
    try {
      const res = await apiFetch(`/api/monthly-excerpts/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isShared: next }),
      });
      if (!res.ok) {
        toast.error(await failureMessage(res, fallback));
        return;
      }
      setShareOpen(false);
      toast.success(next ? '친구에게 보여 줘요.' : '나만 봐요.');
      router.refresh();
    } catch (error) {
      if (!(error instanceof SessionExpiredError)) toast.error(fallback);
    } finally {
      lock.release();
    }
  };

  const remove = async () => {
    if (!lock.acquire()) return;
    const fallback = '달의 발췌집을 지우지 못했어요. 잠시 뒤 다시 시도해 주세요.';
    try {
      const res = await apiFetch(`/api/monthly-excerpts/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        toast.error(await failureMessage(res, fallback));
        return;
      }
      toast.success('달의 발췌집을 지웠어요.');
      setDeleteOpen(false);
      router.replace('/excerpts');
      router.refresh();
    } catch (error) {
      if (!(error instanceof SessionExpiredError)) toast.error(fallback);
    } finally {
      lock.release();
    }
  };

  return (
    <>
      <TopBarActions>
        <button
          type="button"
          aria-label="이미지로 내보내기"
          onClick={() => setExportOpen(true)}
          className={ICON_BUTTON}
        >
          <Share size={22} strokeWidth={1.75} aria-hidden />
        </button>
      </TopBarActions>

      <MonthlyExcerptReader
        month={month}
        items={items}
        viewer="owner"
        reactions={
          reactions !== undefined ? (
            <MonthlyExcerptReactions
              excerptId={id}
              month={month}
              currentUserId={currentUserId}
              initial={reactions}
              hidden={!isShared || impact.publicCount === 0}
            />
          ) : null
        }
        actions={
          // 두 줄: 위는 이 권으로 하는 일(내보내기·고치기), 아래는 권의 상태(공개 범위)와 지우기.
          // 표제지의 책 목록과 같은 폭에 맞춰, 묶음·펼침·넓은 화면 어디서도 같은 모양으로 놓인다
          <div className="w-full">
            {/* 상단 바는 모바일에만 있다. 넓은 화면에서도 내보낼 수 있게 책별 발췌집처럼 버튼을 함께 둔다 */}
            <div className="flex gap-2">
              <Button size="sm" className="flex-1" onClick={() => setExportOpen(true)}>
                이미지로 내보내기
              </Button>
              <Button asChild size="sm" variant="secondary" className="flex-1">
                <Link href={`/excerpts/${month}/compose`}>고치기</Link>
              </Button>
            </div>
            <div className="mt-1.5 flex items-center justify-between gap-3">
              {/* 기록 쓰기의 공개 표시와 같은 모양 — 지금 상태를 보이고, 누르면 바꾼다 */}
              <button
                type="button"
                aria-pressed={!isShared}
                disabled={lock.busy}
                onClick={() => (isShared ? void setShared(false) : setShareOpen(true))}
                className={clsx(
                  '-ml-0.5 inline-flex h-10 items-center gap-1.5 whitespace-nowrap pr-2 font-sans text-[14px]',
                  'focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:opacity-60',
                  isShared ? 'font-medium text-ink-sub' : 'font-semibold text-ink'
                )}
              >
                {isShared ? (
                  <LockOpen size={17} strokeWidth={1.75} aria-hidden />
                ) : (
                  <Lock size={17} strokeWidth={1.75} aria-hidden />
                )}
                {isShared ? '친구에게 보임' : '나만 보기'}
              </button>
              <Button
                size="sm"
                variant="ghost"
                className="-mr-4"
                onClick={() => setDeleteOpen(true)}
              >
                지우기
              </Button>
            </div>
            {isShared && impact.publicCount === 0 && (
              <p className="mt-1 text-balance break-keep font-sans text-body-sm text-ink-sub">
                {NO_PUBLIC_QUOTES}
              </p>
            )}
          </div>
        }
      />

      <MonthlyExcerptExport
        month={month}
        items={items}
        open={exportOpen}
        onOpenChange={setExportOpen}
      />

      <Sheet
        open={deleteOpen}
        onClose={() => !lock.isLocked() && setDeleteOpen(false)}
        title="달의 발췌집을 지울까요?"
      >
        <p className="font-sans text-body text-ink-sub">
          달의 발췌집만 지워져요. 남긴 기록은 그대로예요.
        </p>
        <div className="mt-[18px] flex gap-2">
          <Button
            variant="secondary"
            className="flex-1"
            disabled={lock.busy}
            onClick={() => setDeleteOpen(false)}
          >
            그대로 두기
          </Button>
          <Button variant="danger" className="flex-1" disabled={lock.busy} onClick={remove}>
            지우기
          </Button>
        </div>
      </Sheet>

      <Sheet
        open={shareOpen}
        onClose={() => !lock.isLocked() && setShareOpen(false)}
        title="친구에게 보여 줄까요?"
      >
        {impact.publicCount === 0 ? (
          <p className="font-sans text-body text-ink-sub">{NO_PUBLIC_QUOTES}</p>
        ) : (
          impact.lines.length > 0 && (
            <ul className="font-sans text-body text-ink-sub">
              {impact.lines.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          )
        )}
        <div className="mt-[18px] flex gap-2">
          <Button
            variant="secondary"
            className="flex-1"
            disabled={lock.busy}
            onClick={() => setShareOpen(false)}
          >
            다음에
          </Button>
          <Button
            className="flex-1"
            disabled={lock.busy || impact.publicCount === 0}
            onClick={() => setShared(true)}
          >
            친구에게 보여 주기
          </Button>
        </div>
      </Sheet>
    </>
  );
}
