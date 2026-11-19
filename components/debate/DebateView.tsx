'use client';

import { Fragment, useCallback, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import clsx from 'clsx';
import { MoreHorizontal } from 'lucide-react';
import { toast } from 'sonner';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import Sheet from '@/components/ui/Sheet';
import { Textarea } from '@/components/ui/Textarea';
import { TopBarActions, useTopBar } from '@/components/shell/TopBarContext';
import { clearSummary, deleteDebate, fetchDebate, updateQuestion } from '@/lib/debate/client';
import type { DebateDetail, DebateSection as Section } from '@/lib/debate/types';
import { toChars } from '@/lib/debate/underline';
import AnswerComposer from './AnswerComposer';
import ComposerHost from './ComposerHost';
import DebateSection, { sectionDomId, sectionLabel } from './DebateSection';
import { HIGHLIGHT } from './highlight';
import ReportSheet from './ReportSheet';
import SummaryEditor from './SummaryEditor';
import { profileHref } from './AnswerItem';

const keyOf = (s: Pick<Section, 'position'>) => String(s.position ?? 'whole');
const MENU_ROW =
  'flex min-h-12 w-full items-center border-b border-hairline px-1 font-sans text-body text-ink last:border-b-0';

const dateLabel = (iso: string) => {
  const d = new Date(iso);
  return `${d.getMonth() + 1}월 ${d.getDate()}일`;
};

/**
 * 토론 한 편 — 위에 밑줄 친 문장·정리·질문, 아래로 밑줄마다 단락.
 * 넓은 화면(lg)은 왼쪽에 문장과 질문을 붙여 두고 오른쪽에 단락을 둔다.
 */
export default function DebateView({ initial }: { initial: DebateDetail }) {
  const router = useRouter();
  const [debate, setDebate] = useState(initial);
  const closedAtStart = Boolean(initial.closedAt);
  const [expanded, setExpanded] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(initial.sections.map((s) => [keyOf(s), !closedAtStart]))
  );
  const [composerFor, setComposerFor] = useState<string | null>(null);
  const [menu, setMenu] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState(false);
  const [summarizing, setSummarizing] = useState(false);
  const [reporting, setReporting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [busy, setBusy] = useState(false);

  useTopBar({ title: '토론', back: { href: '/social/talk', label: '토론' } });

  const refresh = useCallback(async () => {
    try {
      setDebate(await fetchDebate(debate.id));
    } catch {
      toast('토론을 다시 불러오지 못했어요.');
    }
  }, [debate.id]);

  const openSection = (s: Section, scroll = true) => {
    setExpanded((e) => ({ ...e, [keyOf(s)]: true }));
    if (scroll) {
      requestAnimationFrame(() =>
        document
          .getElementById(sectionDomId(s))
          ?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      );
    }
  };

  const answerTo = (position: number | null) => {
    const s = debate.sections.find((x) => x.position === position);
    if (s) openSection(s, false);
    setComposerFor(String(position ?? 'whole'));
  };

  const isOwner = debate.owner.isMe;
  const chars = useMemo(() => toChars(debate.quote), [debate.quote]);

  // 문장: 밑줄 구간은 그 단락으로 가는 버튼, 끝에 답 수를 작게
  const ranged = debate.sections
    .filter((s) => s.range)
    .sort((a, b) => a.range!.start - b.range!.start);
  const pieces: React.ReactNode[] = [];
  let cursor = 0;
  for (const s of ranged) {
    const { start, end } = s.range!;
    if (start > cursor) pieces.push(chars.slice(cursor, start).join(''));
    pieces.push(
      // 형광펜: 줄 안에 흐르는 링크여야 줄마다 칠해진다(button은 inline-block이라 덩어리로 끊긴다)
      <a
        key={keyOf(s)}
        href={`#${sectionDomId(s)}`}
        onClick={(e) => {
          e.preventDefault();
          openSection(s);
        }}
        aria-label={`‘${sectionLabel(debate, s)}’에 붙은 답 ${s.count}개 보기`}
        data-highlight
        className={clsx(
          HIGHLIGHT,
          'text-ink transition-colors hover:bg-accent/[0.28] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent'
        )}
      >
        {chars.slice(start, end + 1).join('')}
        {s.count > 0 && (
          <sup className="ml-0.5 font-sans text-[11px] font-bold text-accent no-underline">
            {s.count}
          </sup>
        )}
      </a>
    );
    cursor = end + 1;
  }
  if (cursor < chars.length) pieces.push(chars.slice(cursor).join(''));

  const ownerHref = !isOwner && debate.owner.isFriend ? profileHref(debate.owner) : null;
  const sourceHref = debate.sourceEntryId
    ? isOwner
      ? `/entry/${debate.sourceEntryId}`
      : `${profileHref(debate.owner)}/entry/${debate.sourceEntryId}`
    : null;
  const pages = debate.pageFrom
    ? `p.${debate.pageFrom}${debate.pageTo ? `–${debate.pageTo}` : ''}`
    : null;
  const t = debate.totals;

  const run = async (fn: () => Promise<unknown>, done: string, after?: () => void) => {
    setBusy(true);
    try {
      await fn();
      toast(done);
      if (after) after();
      else await refresh();
    } catch (e) {
      toast(e instanceof Error ? e.message : '잠시 후 다시 시도해 주세요.');
    } finally {
      setBusy(false);
      setMenu(false);
    }
  };

  const head = (
    <div>
      <div className="flex items-start justify-between gap-3">
        <p className="font-sans text-caption text-ink-sub">
          {ownerHref ? (
            <Link href={ownerHref} className="font-semibold text-ink hover:underline">
              {debate.owner.nickname}
            </Link>
          ) : (
            <span className="font-semibold text-ink">{isOwner ? '나' : debate.owner.nickname}</span>
          )}
          {' · '}
          {dateLabel(debate.createdAt)}
          {debate.closedAt && ` · ${dateLabel(debate.closedAt)} 정리`}
        </p>
        {/* 넓은 화면엔 상단 바가 없어 메뉴(정리하기·다시 열기·질문 고치기·지우기·신고)를 여기서 연다 */}
        <button
          type="button"
          data-desktop-menu
          aria-label="토론 메뉴"
          onClick={() => setMenu(true)}
          className="-mr-2 -mt-2.5 hidden h-10 w-10 shrink-0 place-items-center rounded-full text-ink-sub transition-colors hover:bg-ink/[0.05] hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent lg:grid"
        >
          <MoreHorizontal size={21} strokeWidth={1.75} aria-hidden />
        </button>
      </div>

      <p className="mt-3 whitespace-pre-wrap break-keep font-serif text-quote leading-[1.75] text-ink lg:text-quote-lg">
        {pieces.map((p, i) => (
          <Fragment key={i}>{p}</Fragment>
        ))}
      </p>
      <p className="mt-2 font-sans text-fine text-ink-faint">
        {debate.bookTitle}
        {debate.bookAuthor && ` · ${debate.bookAuthor}`}
        {pages && ` · ${pages}`}
        {sourceHref && (
          <>
            {' · '}
            <Link href={sourceHref} className="hover:text-ink-sub">
              기록 보기
            </Link>
          </>
        )}
      </p>

      {debate.summary && (
        <div className="vellum relative -mx-2 mt-5 rounded-[2px] px-4 pb-4 pt-3.5 motion-safe:-rotate-[0.4deg]">
          <p className="font-sans text-fine font-semibold text-accent">
            {isOwner ? '나의 정리' : `${debate.owner.nickname}의 정리`}
          </p>
          <p className="mt-1.5 whitespace-pre-wrap font-serif text-note text-ink">
            {debate.summary.body}
          </p>
          {debate.summary.pins.length > 0 && (
            <ul className="mt-2.5 space-y-1.5">
              {debate.summary.pins.map((p) => (
                <li
                  key={p.answerId}
                  className="border-l-2 border-hairline-strong pl-2.5 font-sans text-fine text-ink-sub"
                >
                  {p.deleted ? (
                    <span className="text-ink-faint">지운 답이에요</span>
                  ) : (
                    <a href={`#answer-${p.answerId}`} className="hover:text-ink">
                      {p.nickname} · {p.firstLine}
                    </a>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <p className="mt-5 whitespace-pre-wrap break-keep border-l-2 border-accent pl-3 font-serif text-[19px] font-semibold leading-[1.6] text-ink">
        {debate.question}
      </p>
      <p className="mt-3 flex flex-wrap gap-x-3 font-sans text-caption text-ink-sub">
        <span>
          <b className="text-ink">{t.agree}</b> 공감
        </span>
        <span>
          <b className="text-ink">{t.differ}</b> 다르게 읽음
        </span>
        <span>
          <b className="text-ink">{t.question}</b> 질문
        </span>
        {t.movedPeople > 0 && (
          <span>
            생각이 바뀐 사람 <b className="text-ink">{t.movedPeople}</b>
          </span>
        )}
      </p>
      {debate.canAnswer ? (
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <Button variant="secondary" size="sm" onClick={() => answerTo(null)}>
            문장 전체에 답하기
          </Button>
          {ranged.length > 0 && (
            <span className="font-sans text-fine text-ink-faint">
              밑줄을 누르면 그 부분에 붙은 답으로 가요
            </span>
          )}
        </div>
      ) : (
        <p className="mt-4 font-sans text-caption text-ink-sub">
          정리된 토론이에요. 답을 읽고 “생각이 바뀌었어요”는 남길 수 있어요.
        </p>
      )}
    </div>
  );

  return (
    <>
      <TopBarActions>
        <button
          type="button"
          aria-label="토론 메뉴"
          onClick={() => setMenu(true)}
          className="grid h-11 w-11 place-items-center rounded-full text-ink"
        >
          <MoreHorizontal size={23} strokeWidth={1.75} aria-hidden />
        </button>
      </TopBarActions>

      <div className="mx-auto max-w-[1040px] pb-20 lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-start lg:gap-14">
        <div className="lg:sticky lg:top-10">{head}</div>

        <div className="mt-6 lg:mt-0">
          {debate.sections.map((s) => {
            const k = keyOf(s);
            return (
              <DebateSection
                key={k}
                debate={debate}
                section={s}
                expanded={Boolean(expanded[k])}
                onToggle={() => setExpanded((e) => ({ ...e, [k]: !e[k] }))}
                onAnswer={answerTo}
                onChanged={refresh}
                composer={
                  <ComposerHost
                    open={composerFor === k}
                    title={
                      s.position === null
                        ? '문장 전체에 답하기'
                        : `‘${sectionLabel(debate, s)}’에 답하기`
                    }
                    onClose={() => setComposerFor(null)}
                  >
                    <AnswerComposer
                      debateId={debate.id}
                      target={{
                        kind: 'answer',
                        position: s.position,
                        label: sectionLabel(debate, s),
                        prompt: s.prompt,
                      }}
                      onCancel={() => setComposerFor(null)}
                      onDone={() => {
                        setComposerFor(null);
                        toast('남겼어요');
                        void refresh();
                      }}
                    />
                  </ComposerHost>
                }
              />
            );
          })}
        </div>
      </div>

      <Sheet open={menu} onClose={() => setMenu(false)} ariaLabel="토론 메뉴">
        <div className="-mt-3">
          {isOwner ? (
            <>
              <button
                type="button"
                className={MENU_ROW}
                onClick={() => (setMenu(false), setEditingQuestion(true))}
              >
                질문 고치기
              </button>
              <button
                type="button"
                className={MENU_ROW}
                onClick={() => (setMenu(false), setSummarizing(true))}
              >
                {debate.closedAt ? '정리 고치기' : '정리하기'}
              </button>
              {debate.closedAt && (
                <button
                  type="button"
                  className={MENU_ROW}
                  disabled={busy}
                  onClick={() => run(() => clearSummary(debate.id), '다시 열었어요')}
                >
                  다시 열기
                </button>
              )}
              <button
                type="button"
                className={clsx(MENU_ROW, 'text-danger')}
                onClick={() => (setMenu(false), setConfirmDelete(true))}
              >
                토론 지우기
              </button>
            </>
          ) : (
            <button
              type="button"
              className={MENU_ROW}
              onClick={() => (setMenu(false), setReporting(true))}
            >
              이 토론 신고하기
            </button>
          )}
        </div>
      </Sheet>

      {isOwner && (
        <>
          <QuestionEditor
            open={editingQuestion}
            initial={debate.question}
            onClose={() => setEditingQuestion(false)}
            onSave={(q) =>
              run(
                () => updateQuestion(debate.id, q),
                '질문을 고쳤어요',
                () => {
                  setEditingQuestion(false);
                  void refresh();
                }
              )
            }
            busy={busy}
          />
          {summarizing && (
            <SummaryEditor
              open={summarizing}
              onClose={() => setSummarizing(false)}
              debate={debate}
              onSaved={() => {
                setExpanded(Object.fromEntries(debate.sections.map((s) => [keyOf(s), false])));
                void refresh();
              }}
            />
          )}
          <Modal
            isOpen={confirmDelete}
            onClose={() => !busy && setConfirmDelete(false)}
            ariaLabel="이 토론을 지울까요"
          >
            <h2 className="font-sans text-[18px] font-bold text-ink">이 토론을 지울까요</h2>
            <p className="mt-2 font-sans text-caption text-ink-sub">
              {t.agree + t.differ + t.question > 0
                ? `친구들이 남긴 답 ${t.agree + t.differ + t.question}개도 함께 사라져요.`
                : '원래 기록은 그대로 남아요.'}
            </p>
            <div className="mt-5 flex gap-2">
              <Button
                variant="secondary"
                className="flex-1"
                disabled={busy}
                onClick={() => setConfirmDelete(false)}
              >
                그대로 두기
              </Button>
              <Button
                variant="danger"
                className="flex-1"
                disabled={busy}
                onClick={() =>
                  run(
                    () => deleteDebate(debate.id),
                    '토론을 지웠어요',
                    () => router.replace('/social/talk')
                  )
                }
              >
                지우기
              </Button>
            </div>
          </Modal>
        </>
      )}
      {!isOwner && (
        <ReportSheet
          open={reporting}
          onClose={() => setReporting(false)}
          debateId={debate.id}
          answerId={null}
        />
      )}
    </>
  );
}

function QuestionEditor({
  open,
  initial,
  onClose,
  onSave,
  busy,
}: {
  open: boolean;
  initial: string;
  onClose(): void;
  onSave(q: string): void;
  busy: boolean;
}) {
  const [q, setQ] = useState(initial);
  return (
    <Sheet open={open} onClose={onClose} title="질문 고치기">
      <Textarea
        autoGrow
        aria-label="질문"
        variant="line"
        fullWidth
        rows={3}
        maxLength={500}
        value={q}
        onChange={(e) => setQ(e.target.value)}
        className="font-serif"
      />
      <p className="mt-2 font-sans text-fine text-ink-faint">밑줄은 올린 뒤에 고칠 수 없어요.</p>
      <Button
        fullWidth
        className="mt-4"
        disabled={!q.trim() || busy}
        loading={busy}
        onClick={() => onSave(q.trim())}
      >
        고치기
      </Button>
    </Sheet>
  );
}
