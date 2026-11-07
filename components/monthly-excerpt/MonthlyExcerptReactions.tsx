'use client';

import { useCommentCount } from '@/components/social/useCommentCount';
import { useMemo, useState } from 'react';
import CommentBottomSheet from '@/components/comments/CommentBottomSheet';
import LikersBottomSheet from '@/components/social/LikersBottomSheet';
import SocialActionBar from '@/components/social/SocialActionBar';
import { useLike } from '@/components/social/useLike';
import type { CommentTarget } from '@/lib/comments/target';
import { monthLabel } from '@/lib/monthly-excerpt/month';
import type { MonthKey, MonthlyExcerptReactionCounts } from '@/lib/monthly-excerpt/types';

const NOTICE = 'font-sans text-body-sm text-ink-sub text-balance break-keep';

interface Props {
  excerptId: string;
  month: MonthKey;
  currentUserId?: string;
  /** 서버에서 읽은 첫 수. 읽지 못했으면 null */
  initial: MonthlyExcerptReactionCounts | null;
  /** 친구에게 보이지 않는 동안(소유자 화면) */
  hidden?: boolean;
}

/** 달의 발췌집 한 권에 남긴 좋아요와 댓글. 내 화면과 친구 화면의 책 아래에 놓인다 */
export default function MonthlyExcerptReactions({ initial, hidden = false, ...rest }: Props) {
  return (
    <section aria-label="좋아요와 댓글" className="mt-[22px]">
      {hidden && (
        <p className={`${NOTICE} mb-2`}>친구에게 보이지 않는 동안 새 반응을 받지 않아요</p>
      )}
      {initial ? (
        <ReactionBar initial={initial} {...rest} />
      ) : (
        // 수를 모르는데 0으로 그리면 반응이 사라진 것처럼 보인다
        <p role="status" className={NOTICE}>
          반응을 불러오지 못했어요. 잠시 뒤 다시 열어 주세요.
        </p>
      )}
    </section>
  );
}

function ReactionBar({
  excerptId,
  month,
  currentUserId,
  initial,
}: Omit<Props, 'initial' | 'hidden'> & { initial: MonthlyExcerptReactionCounts }) {
  const target = useMemo<CommentTarget>(
    () => ({ kind: 'monthly_excerpt', excerptId }),
    [excerptId]
  );
  const like = useLike(target, initial.liked, initial.likeCount);
  const [commentCount, setCommentCount] = useCommentCount(initial.commentCount);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [likersOpen, setLikersOpen] = useState(false);

  return (
    <>
      <SocialActionBar
        target={target}
        initialLikeCount={initial.likeCount}
        initialLiked={initial.liked}
        like={like}
        commentCount={commentCount}
        onCommentClick={() => setCommentsOpen(true)}
        onLikeCountClick={() => setLikersOpen(true)}
        // 판권의 선이 바로 위에 있어 선을 또 긋지 않는다
        border={false}
      />
      <LikersBottomSheet target={target} isOpen={likersOpen} onClose={() => setLikersOpen(false)} />
      <CommentBottomSheet
        target={target}
        currentUserId={currentUserId}
        isOpen={commentsOpen}
        onClose={() => setCommentsOpen(false)}
        onCountChange={setCommentCount}
        context={`${monthLabel(month)}의 발췌집`}
      />
    </>
  );
}
