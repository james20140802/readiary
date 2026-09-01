'use client';

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
 */
export function useLike(
  entryId: string,
  initialLiked: boolean,
  initialLikeCount: number
): LikeState {
  const [isLiked, setIsLiked] = useState(initialLiked);
  const [likeCount, setLikeCount] = useState(initialLikeCount);
  const [isLoading, setIsLoading] = useState(false);

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
      const response = await fetch('/api/likes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entryId }),
      });

      if (!response.ok) throw new Error('Network response was not ok');

      const result = await response.json();
      setIsLiked(result.liked);
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
