'use client';

import { useLayoutEffect } from 'react';

const COMMENTS = [
  {
    id: 'c1',
    entry_id: 'e1',
    user_id: 'u-dohyun',
    parent_id: null,
    content: '오늘 아침에 딱 필요했던 말.',
    created_at: '2026-10-22T23:00:00.000Z',
    profile: { name: '도현', nickname: 'dohyun', tag: '1187', profile_image: null },
  },
  {
    id: 'c2',
    entry_id: 'e1',
    user_id: 'u-yunseo',
    parent_id: 'c1',
    content: '출근길에 다시 읽어 봐.',
    created_at: '2026-10-23T00:00:00.000Z',
    profile: { name: '윤서', nickname: 'yunseo', tag: '2041', profile_image: null },
  },
  {
    id: 'c3',
    entry_id: 'e1',
    user_id: 'lab-me',
    parent_id: null,
    content: '질문을 바꾸는 게 제일 어렵더라.',
    created_at: '2026-10-23T00:55:00.000Z',
    profile: { name: '나', nickname: 'readiary', tag: '0417', profile_image: null },
  },
];

const LIKERS = [
  {
    id: 'u-dohyun',
    name: '도현',
    nickname: 'dohyun',
    tag: '1187',
    liked_at: '2026-10-22T23:00:00.000Z',
    is_accessible: true,
  },
  {
    id: 'u-x',
    name: '모르는 사람',
    nickname: 'x',
    tag: '0001',
    liked_at: '2026-10-21T23:00:00.000Z',
    is_accessible: false,
  },
];

/**
 * 견본 전용: 이 화면의 /api/* 요청을 브라우저 안에서 가짜 응답으로 돌려준다.
 * 로그인 없이 시트·좋아요를 눌러 봐도 실제 서버(프로덕션 DB)로 요청이 나가지 않고, 로그인 화면으로 튕기지 않는다.
 */
export default function LabFetchStub() {
  useLayoutEffect(() => {
    const original = window.fetch;
    let liked = true;
    window.fetch = async (input, init) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
      const path = new URL(url, window.location.origin).pathname;
      if (!path.startsWith('/api/')) return original(input, init);
      const json = (body: unknown) =>
        new Response(JSON.stringify(body), { headers: { 'Content-Type': 'application/json' } });
      await new Promise((r) => setTimeout(r, 300));
      const method = (init?.method ?? 'GET').toUpperCase();
      if (path === '/api/comments' && method === 'GET') return json(COMMENTS);
      if (path === '/api/likes' && method === 'GET') return json(LIKERS);
      if (path === '/api/likes' && method === 'POST') {
        liked = !liked;
        return json({ liked });
      }
      return json({ ok: true });
    };
    return () => {
      window.fetch = original;
    };
  }, []);
  return null;
}
