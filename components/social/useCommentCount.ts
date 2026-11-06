'use client';

import { useCallback, useRef, useState } from 'react';
import {
  reactionKey,
  rememberCommentCount,
  resolveCommentCount,
} from '@/lib/comments/reactionMemory';
import type { CommentTarget } from '@/lib/comments/target';

/**
 * 댓글 수. 댓글 시트가 알려 주는 새 수를 이 탭에 기억해 두어,
 * 뒤로 가기로 예전 화면 데이터가 돌아와도 방금 바뀐 수를 보여 준다.
 */
export function useCommentCount(
  target: CommentTarget | string,
  initialCount: number
): [number, (count: number) => void] {
  const key = reactionKey(target);
  const [count, setCount] = useState(() => resolveCommentCount(key, initialCount));
  const current = useRef(count);

  const update = useCallback(
    (next: number) => {
      rememberCommentCount(key, current.current, next);
      current.current = next;
      setCount(next);
    },
    [key]
  );

  return [count, update];
}
