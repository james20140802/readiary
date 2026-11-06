'use client';

import { apiFetch } from '@/lib/api/fetch';
import { reactionKey, rememberLike, resolveLike } from '@/lib/comments/reactionMemory';
import { likePayload, likesUrl, type CommentTarget } from '@/lib/comments/target';
import { useState } from 'react';

export interface LikeState {
  isLiked: boolean;
  likeCount: number;
  isLoading: boolean;
  toggle: () => Promise<void>;
}

/**
 * 좋아요 낙관적 토글 상태.
 * 액션 바가 한 기록의 여러 면(엽서 앞·뒷면)에 놓일 때
 * 부모에서 한 번 만들어 내려주면 상태가 공유된다.
 * 문자열은 기록 id다(기존 호출). 달의 발췌집은 CommentTarget으로 넘긴다.
 */
export function useLike(
  target: CommentTarget | string,
  initialLiked: boolean,
  initialLikeCount: number
): LikeState {
  const key = reactionKey(target);
  // 뒤로 가기로 예전 화면 데이터가 돌아와도 이 탭에서 바꾼 좋아요를 잃지 않는다
  const [start] = useState(() =>
    resolveLike(key, { liked: initialLiked, likeCount: initialLikeCount })
  );
  const [isLiked, setIsLiked] = useState(start.liked);
  const [likeCount, setLikeCount] = useState(start.likeCount);
  const [isLoading, setIsLoading] = useState(false);

  const resolved: CommentTarget =
    typeof target === 'string' ? { kind: 'entry', entryId: target } : target;

  const toggle = async () => {
    if (isLoading) return; // 연속 클릭 방지

    // [Step 1] 이전 상태 저장 (롤백용)
    const prevLiked = isLiked;
    const prevCount = likeCount;

    // [Step 2] UI 즉시 업데이트 (낙관적)
    setIsLiked(!prevLiked);
    setLikeCount(prevLiked ? prevCount - 1 : prevCount + 1);
    setIsLoading(true);

    try {
      const response = await apiFetch(likesUrl(resolved), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(likePayload(resolved)),
      });

      if (!response.ok) throw new Error('Network response was not ok');

      const result = await response.json();
      const liked = Boolean(result.liked);
      // 서버가 낙관적 결과와 다르게 답하면(이미 눌려 있던 경우 등) 수는 그대로다
      const count = liked === prevLiked ? prevCount : prevLiked ? prevCount - 1 : prevCount + 1;
      setIsLiked(liked);
      setLikeCount(count);
      rememberLike(key, { liked: prevLiked, likeCount: prevCount }, { liked, likeCount: count });
    } catch (error) {
      // [Step 3] 에러 발생 시 롤백
      console.error('Like failed:', error);
      setIsLiked(prevLiked);
      setLikeCount(prevCount);
    } finally {
      setIsLoading(false);
    }
  };

  return { isLiked, likeCount, isLoading, toggle };
}
