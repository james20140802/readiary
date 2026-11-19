'use client';

import { useState } from 'react';
import Link from 'next/link';
import clsx from 'clsx';
import { ArrowUpRight, MoreHorizontal } from 'lucide-react';
import { toast } from 'sonner';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import Sheet from '@/components/ui/Sheet';
import { deleteAnswer, fetchReplies, setHidden, setMove } from '@/lib/debate/client';
import type { DebateAnswer, DebateDetail, DebatePerson } from '@/lib/debate/types';
import AnswerComposer, { type ComposerTarget } from './AnswerComposer';
import ComposerHost from './ComposerHost';
import MoversSheet from './MoversSheet';
import ReportSheet from './ReportSheet';
import StanceMark from './StanceMark';

interface AnswerItemProps {
  debate: DebateDetail;
  answer: DebateAnswer;
  /** 대표 답 라벨("생각을 가장 많이 바꾼 답" 등). 없으면 보이지 않는다 */
  label?: string | null;
  /** 답글이면 true — 생각이 바뀌었어요·답글이 없다 */
  nested?: boolean;
  /** 고치거나 지우거나 숨겨 토론을 다시 불러와야 할 때 */
  onChanged(): void;
}

export const profileHref = (p: Pick<DebatePerson, 'nickname' | 'tag'>) =>
  p.nickname && p.tag ? `/social/u/${p.nickname}-${p.tag}` : null;

const MENU_ROW =
  'flex min-h-12 w-full items-center gap-3 border-b border-hairline px-1 font-sans text-body text-ink last:border-b-0';

/** 작성자 이름 — 나·친구는 서재로 이어지고, 친구가 아닌 사람은 이름만. 떠난 사람은 이름을 가린다 */
export function AuthorName({ person }: { person: DebatePerson }) {
  if (!person.active) return <span className="text-ink-faint">떠난 사람</span>;
  if (person.isMe) return <span>나</span>;
  const href = person.isFriend ? profileHref(person) : null;
  return href ? (
    <Link href={href} className="hover:underline">
      {person.nickname}
    </Link>
  ) : (
    <span>{person.nickname}</span>
  );
}

/** 답 하나(또는 답글) — 카드 대신 헤어라인으로 나눈 원고 흐름 */
export default function AnswerItem({ debate, answer, label, nested, onChanged }: AnswerItemProps) {
  const isMine = answer.author.isMe;
  const isOwner = debate.owner.isMe;
  const [moved, setMoved] = useState({ count: answer.movedCount, byMe: answer.movedByMe });
  // 신고는 다시 불러오기 전에도 이 화면에 바로 반영한다(접고, 신고하기를 거둔다)
  const [reportedHere, setReportedHere] = useState(false);
  const reported = answer.reportedByMe || reportedHere;
  const [revealed, setRevealed] = useState(!answer.reportedByMe);
  const [replies, setReplies] = useState<DebateAnswer[]>(answer.replies ?? []);
  // 토론을 다시 불러오면 새 답(답글·누른 수·고친 글)으로 맞춘다 — 렌더 중에 이전 값과 비교해 바꾼다
  const [seen, setSeen] = useState(answer);
  if (seen !== answer) {
    setSeen(answer);
    setReplies(answer.replies ?? []);
    setMoved({ count: answer.movedCount, byMe: answer.movedByMe });
    setRevealed(!answer.reportedByMe);
    setReportedHere(false);
  }
  const [composer, setComposer] = useState<ComposerTarget | null>(null);
  const [menu, setMenu] = useState(false);
  const [reporting, setReporting] = useState(false);
  const [movers, setMovers] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [busy, setBusy] = useState(false);

  const gone = answer.deleted || !answer.author.active;
  const canAct = !gone && !answer.hidden;

  const toggleMove = async () => {
    const on = !moved.byMe;
    const before = moved;
    setMoved({ count: moved.count + (on ? 1 : -1), byMe: on });
    try {
      const count = await setMove(answer.id, on);
      setMoved({ count, byMe: on });
    } catch (e) {
      setMoved(before);
      toast(e instanceof Error ? e.message : '반영하지 못했어요.');
    }
  };

  const loadAllReplies = async () => {
    try {
      setReplies(await fetchReplies(answer.id));
    } catch {
      toast('답글을 불러오지 못했어요.');
    }
  };

  const run = async (fn: () => Promise<unknown>, done: string) => {
    setBusy(true);
    try {
      await fn();
      toast(done);
      onChanged();
    } catch (e) {
      toast(e instanceof Error ? e.message : '잠시 후 다시 시도해 주세요.');
    } finally {
      setBusy(false);
      setMenu(false);
      setConfirmDelete(false);
    }
  };

  if (!revealed) {
    return (
      <div
        className={clsx(
          'py-3 font-sans text-caption text-ink-faint',
          !nested && 'border-b border-hairline'
        )}
      >
        신고한 답이에요 ·{' '}
        <button
          type="button"
          className="font-semibold text-ink-sub"
          onClick={() => setRevealed(true)}
        >
          펼치기
        </button>
      </div>
    );
  }

  const evidenceHref = answer.evidence?.entryId
    ? isMine
      ? `/entry/${answer.evidence.entryId}`
      : `${profileHref(answer.author)}/entry/${answer.evidence.entryId}`
    : null;

  const menuItems = [
    isMine && !answer.deleted && debate.canAnswer && (
      <button
        key="edit"
        type="button"
        className={MENU_ROW}
        onClick={() => (setMenu(false), setComposer({ kind: 'edit', answer }))}
      >
        고치기
      </button>
    ),
    isMine && !answer.deleted && (
      <button
        key="del"
        type="button"
        className={`${MENU_ROW} text-danger`}
        onClick={() => (setMenu(false), setConfirmDelete(true))}
      >
        지우기
      </button>
    ),
    isOwner && !isMine && !answer.deleted && (
      <button
        key="hide"
        type="button"
        className={MENU_ROW}
        disabled={busy}
        onClick={() =>
          run(
            () => setHidden(answer.id, !answer.hidden),
            answer.hidden ? '다시 보이게 했어요' : '숨겼어요'
          )
        }
      >
        {answer.hidden ? '숨김 풀기' : '숨기기'}
      </button>
    ),
    !isMine && !reported && (
      <button
        key="report"
        type="button"
        className={MENU_ROW}
        onClick={() => (setMenu(false), setReporting(true))}
      >
        신고하기
      </button>
    ),
  ].filter(Boolean);

  return (
    <article
      id={`answer-${answer.id}`}
      className={clsx(nested ? 'py-2.5' : 'scroll-mt-28 border-b border-hairline py-4')}
    >
      {label && <p className="mb-1 font-sans text-fine font-semibold text-accent">{label}</p>}
      <div className="flex items-center gap-2 font-sans text-caption font-semibold text-ink">
        <AuthorName person={answer.author} />
        {answer.stance && !gone && <StanceMark stance={answer.stance} />}
        {answer.hidden && <span className="font-medium text-ink-faint">숨긴 답이에요</span>}
        {menuItems.length > 0 && (
          <button
            type="button"
            aria-label={nested ? '답글 메뉴' : '답 메뉴'}
            onClick={() => setMenu(true)}
            className="-mr-2 ml-auto grid h-10 w-10 place-items-center text-ink-faint hover:text-ink"
          >
            <MoreHorizontal size={18} strokeWidth={1.75} aria-hidden />
          </button>
        )}
      </div>

      <p
        className={clsx(
          'mt-1.5 whitespace-pre-wrap break-keep font-serif',
          nested ? 'text-body' : 'text-note',
          gone ? 'text-ink-faint' : 'text-ink'
        )}
      >
        {answer.deleted
          ? '지운 답이에요'
          : !answer.author.active
            ? '떠난 사람의 답이에요'
            : answer.body}
      </p>

      {answer.evidence && !gone && (
        <div className="mt-2.5 border-l-2 border-hairline-strong pl-3">
          <p className="font-serif text-body-sm text-ink">{answer.evidence.quote}</p>
          <p className="mt-0.5 font-sans text-fine text-ink-faint">
            {evidenceHref ? (
              <Link
                href={evidenceHref}
                className="inline-flex items-center gap-0.5 hover:text-ink-sub"
              >
                {isMine ? '내' : answer.author.nickname}의 기록
                <ArrowUpRight size={12} strokeWidth={1.75} aria-hidden />
              </Link>
            ) : (
              `${isMine ? '내' : answer.author.nickname}의 기록`
            )}
            {' · '}
            {answer.evidence.bookTitle}
            {answer.evidence.pageFrom ? ` p.${answer.evidence.pageFrom}` : ''}
          </p>
        </div>
      )}

      {!nested && !gone && (
        <div className="mt-2 flex items-center gap-1 font-sans text-fine">
          {isMine ? (
            <button
              type="button"
              disabled={moved.count === 0}
              onClick={() => setMovers(true)}
              className="min-h-10 pr-2 text-ink-sub disabled:text-ink-faint"
            >
              생각이 바뀌었어요 {moved.count}
            </button>
          ) : (
            <button
              type="button"
              aria-pressed={moved.byMe}
              disabled={!canAct}
              onClick={toggleMove}
              className={clsx(
                'min-h-10 pr-2 transition-colors active:scale-[0.97]',
                moved.byMe ? 'font-semibold text-accent' : 'text-ink-sub hover:text-ink'
              )}
            >
              생각이 바뀌었어요{moved.count > 0 ? ` ${moved.count}` : ''}
            </button>
          )}
          {debate.canAnswer && canAct && (
            <button
              type="button"
              onClick={() => setComposer({ kind: 'reply', answerId: answer.id })}
              className="min-h-10 px-2 text-ink-sub hover:text-ink"
            >
              답글{answer.replyCount > 0 ? ` ${answer.replyCount}` : ''}
            </button>
          )}
          {answer.edited && <span className="ml-auto text-ink-faint">고침</span>}
        </div>
      )}
      {nested && answer.edited && <p className="font-sans text-fine text-ink-faint">고침</p>}

      {!nested && replies.length > 0 && (
        <div className="ml-3 mt-1 border-l border-hairline pl-4">
          {replies.map((r) => (
            <AnswerItem key={r.id} debate={debate} answer={r} nested onChanged={onChanged} />
          ))}
          {answer.replyCount > replies.length && (
            <button
              type="button"
              onClick={loadAllReplies}
              className="min-h-10 font-sans text-fine font-semibold text-accent"
            >
              답글 {answer.replyCount - replies.length}개 더 보기
            </button>
          )}
        </div>
      )}

      <ComposerHost
        open={composer !== null}
        title={composer?.kind === 'edit' ? '고치기' : '답글'}
        onClose={() => setComposer(null)}
      >
        {composer && (
          <AnswerComposer
            debateId={debate.id}
            target={composer}
            onCancel={() => setComposer(null)}
            onDone={() => {
              setComposer(null);
              onChanged();
            }}
          />
        )}
      </ComposerHost>

      <Sheet
        open={menu}
        onClose={() => setMenu(false)}
        ariaLabel={nested ? '답글 메뉴' : '답 메뉴'}
      >
        <div className="-mt-3">{menuItems}</div>
      </Sheet>

      <Modal
        isOpen={confirmDelete}
        onClose={() => !busy && setConfirmDelete(false)}
        ariaLabel="이 답을 지울까요"
      >
        <h2 className="font-sans text-[18px] font-bold text-ink">
          {nested ? '이 답글을 지울까요' : '이 답을 지울까요'}
        </h2>
        {!nested && answer.replyCount > 0 && (
          <p className="mt-2 font-sans text-caption text-ink-sub">
            답글이 달려 있어 “지운 답이에요” 자리가 남아요.
          </p>
        )}
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
            onClick={() => run(() => deleteAnswer(answer.id), '지웠어요')}
          >
            지우기
          </Button>
        </div>
      </Modal>

      <ReportSheet
        open={reporting}
        onClose={() => setReporting(false)}
        debateId={debate.id}
        answerId={answer.id}
        onReported={() => {
          setReportedHere(true);
          setRevealed(false);
        }}
      />
      {isMine && (
        <MoversSheet open={movers} onClose={() => setMovers(false)} answerId={answer.id} />
      )}
    </article>
  );
}
