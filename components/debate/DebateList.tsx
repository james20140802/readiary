'use client';

import { useState } from 'react';
import Link from 'next/link';
import Button from '@/components/ui/Button';
import { LargeTitle } from '@/components/shell/LargeTitle';
import { useTopBar } from '@/components/shell/TopBarContext';
import SocialSegment from '@/components/social/SocialSegment';
import { fetchDebateList } from '@/lib/debate/client';
import type { DebateListItem } from '@/lib/debate/types';
import { toChars } from '@/lib/debate/underline';

interface Page {
  items: DebateListItem[];
  nextBefore: string | null;
}

interface Props {
  initialOpen: Page;
  initialClosed: Page;
  friendCount: number;
}

/** 밑줄 친 문장 — 목록에서는 누르지 않는 그림이다 */
function UnderlinedQuote({ quote, underlines }: Pick<DebateListItem, 'quote' | 'underlines'>) {
  const chars = toChars(quote);
  const out: React.ReactNode[] = [];
  let cursor = 0;
  for (const r of [...underlines].sort((a, b) => a.start - b.start)) {
    if (r.start > cursor) out.push(chars.slice(cursor, r.start).join(''));
    out.push(
      <span
        key={r.start}
        className="underline decoration-accent decoration-2 underline-offset-[5px]"
      >
        {chars.slice(r.start, r.end + 1).join('')}
      </span>
    );
    cursor = r.end + 1;
  }
  if (cursor < chars.length) out.push(chars.slice(cursor).join(''));
  return <>{out}</>;
}

function usePage(initial: Page, closed: boolean) {
  const [page, setPage] = useState(initial);
  const [state, setState] = useState<'idle' | 'loading' | 'error'>('idle');
  const more = async () => {
    if (!page.nextBefore) return;
    setState('loading');
    try {
      const res = await fetchDebateList({ closed, before: page.nextBefore });
      setPage((p) => ({ items: [...p.items, ...res.items], nextBefore: res.nextBefore }));
      setState('idle');
    } catch {
      setState('error');
    }
  };
  return { page, state, more };
}

function MoreRow({
  label,
  state,
  onMore,
}: {
  label: string;
  state: 'idle' | 'loading' | 'error';
  onMore(): void;
}) {
  if (state === 'error') {
    return (
      <p className="py-3 font-sans text-caption text-ink-sub">
        불러오지 못했어요.{' '}
        <button type="button" className="font-semibold text-accent" onClick={onMore}>
          다시 시도
        </button>
      </p>
    );
  }
  return (
    <Button
      variant="secondary"
      size="sm"
      className="mt-4"
      onClick={onMore}
      loading={state === 'loading'}
    >
      {label}
    </Button>
  );
}

/** 토론 목록 — 진행 중(최근 활동 순)과 정리된 토론. 두 목록은 따로 불러오고 실패도 따로 다룬다 */
export default function DebateList({ initialOpen, initialClosed, friendCount }: Props) {
  useTopBar({ title: '토론' });
  const open = usePage(initialOpen, false);
  const closed = usePage(initialClosed, true);
  const empty = open.page.items.length === 0 && closed.page.items.length === 0;

  return (
    <div className="mx-auto max-w-[1040px] pb-20">
      <div className="flex items-center gap-4">
        <LargeTitle>소셜</LargeTitle>
        <Button asChild size="sm" className="ml-auto">
          <Link href="/social/talk/new">발제하기</Link>
        </Button>
      </div>
      <div className="mt-[18px] lg:mt-6">
        <SocialSegment active="talk" />
      </div>

      {empty ? (
        <div className="mt-10 max-w-[520px]">
          <p className="font-serif text-note text-ink">아직 열린 토론이 없어요.</p>
          <p className="mt-2 font-sans text-caption text-ink-sub">
            내 기록 하나를 고르고, 함께 볼 곳에 밑줄을 긋고, 질문을 붙여요
          </p>
          <div className="mt-5 flex gap-2">
            <Button asChild size="sm">
              <Link href="/social/talk/new">첫 토론 열기</Link>
            </Button>
            {friendCount === 0 && (
              <Button asChild size="sm" variant="secondary">
                <Link href="/social/friends">친구 찾기</Link>
              </Button>
            )}
          </div>
        </div>
      ) : (
        <div className="mt-6 lg:mt-8 lg:grid lg:grid-cols-[minmax(0,1.25fr)_minmax(0,0.75fr)] lg:items-start lg:gap-14">
          <section aria-labelledby="debates-open">
            <h2 id="debates-open" className="sr-only">
              진행 중인 토론
            </h2>
            {open.page.items.length === 0 && (
              <p className="py-4 font-sans text-caption text-ink-sub">진행 중인 토론이 없어요.</p>
            )}
            <ul>
              {open.page.items.map((d) => {
                const t = d.totals;
                const dist = [
                  t.agree && `${t.agree} 공감`,
                  t.differ && `${t.differ} 다르게 읽음`,
                  t.question && `${t.question} 질문`,
                ]
                  .filter(Boolean)
                  .join(' · ');
                return (
                  <li key={d.id} className="border-b border-hairline-strong">
                    <Link href={`/social/talk/${d.id}`} className="block py-6 active:opacity-80">
                      <span className="block font-sans text-fine text-ink-sub">
                        <b className="font-semibold text-ink">
                          {d.owner.isMe ? '나' : d.owner.nickname}
                        </b>
                        의 발제
                      </span>
                      <span className="mt-2 block break-keep font-serif text-[21px] leading-[1.7] text-ink lg:text-[23px]">
                        <UnderlinedQuote quote={d.quote} underlines={d.underlines} />
                      </span>
                      <span className="mt-2 block border-l-2 border-accent pl-3 font-serif text-[17px] font-semibold leading-[1.55] text-ink">
                        {d.question}
                      </span>
                      <span className="mt-2.5 block font-sans text-fine text-ink-sub">
                        {dist || '아직 답이 없어요'}
                      </span>
                      {d.topLine && (
                        <span className="mt-3 block border-t border-hairline pt-3">
                          <span className="block font-sans text-fine font-semibold text-ink-sub">
                            {d.topLine.kind === 'most_moved'
                              ? `생각을 가장 많이 바꾼 답 · ${d.topLine.nickname}`
                              : `새 답 · ${d.topLine.nickname}`}
                          </span>
                          <span className="mt-1 line-clamp-2 block font-serif text-body text-ink">
                            {d.topLine.body}
                          </span>
                        </span>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
            {open.page.nextBefore && (
              <MoreRow label="진행 중인 토론 더 보기" state={open.state} onMore={open.more} />
            )}
          </section>

          <section aria-labelledby="debates-closed" className="mt-12 lg:mt-0">
            <h2
              id="debates-closed"
              className="font-sans text-section-title text-ink lg:text-[22px]"
            >
              정리된 토론
            </h2>
            <p className="mt-1 font-sans text-caption text-ink-sub">발제한 사람이 남긴 정리예요</p>
            {closed.page.items.length === 0 && (
              <p className="py-4 font-sans text-caption text-ink-faint">
                아직 정리된 토론이 없어요.
              </p>
            )}
            <ul className="mt-2">
              {closed.page.items.map((d) => (
                <li key={d.id} className="border-t border-hairline">
                  <Link href={`/social/talk/${d.id}`} className="block py-4">
                    <span className="block break-keep font-serif text-[17px] font-semibold leading-[1.55] text-ink">
                      {d.quote}
                    </span>
                    {d.summaryFirstLine && (
                      <span className="mt-1.5 block border-l-2 border-ink pl-3 font-serif text-body text-ink-sub">
                        {d.summaryFirstLine}
                      </span>
                    )}
                    <span className="mt-1.5 block font-sans text-fine text-ink-faint">
                      {d.owner.isMe ? '나' : d.owner.nickname} · 답 {d.answerCount}
                      {d.totals.movedPeople > 0 && ` · 생각이 바뀐 사람 ${d.totals.movedPeople}`}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
            {closed.page.nextBefore && (
              <MoreRow label="정리된 토론 더 보기" state={closed.state} onMore={closed.more} />
            )}
          </section>
        </div>
      )}
    </div>
  );
}
