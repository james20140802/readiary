'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useRef, useState } from 'react';

/**
 * 댓글 수. 댓글 시트가 알려 주는 새 수로 바꾸고, 수가 바뀌면 라우터가 기억해 둔 화면 데이터를 버린다.
 * 뒤로 가기는 서버에 다시 묻지 않고 기억해 둔 데이터를 꺼내므로, 버리지 않으면 피드가 예전 수로 그려진다.
 */
export function useCommentCount(initialCount: number): [number, (count: number) => void] {
  const router = useRouter();
  const [count, setCount] = useState(initialCount);
  const current = useRef(initialCount);

  const update = useCallback(
    (next: number) => {
      if (next === current.current) return;
      current.current = next;
      setCount(next);
      router.refresh();
    },
    [router]
  );

  return [count, update];
}
