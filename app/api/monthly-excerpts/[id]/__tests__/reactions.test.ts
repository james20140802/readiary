import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import {
  notifyMonthlyExcerptEvent,
  retractMonthlyExcerptLikeNotification,
} from '@/lib/notifications/notify';
import { GET as GET_LIKES, POST as POST_LIKE } from '../likes/route';
import {
  DELETE as DELETE_COMMENT,
  GET as GET_COMMENTS,
  POST as POST_COMMENT,
} from '../comments/route';

vi.mock('@/lib/supabase/server', () => ({ createSupabaseServerClient: vi.fn() }));
vi.mock('@/lib/supabase/getServerUser', () => ({ getServerUser: () => getUser() }));
vi.mock('@/lib/notifications/notify', () => ({
  notifyMonthlyExcerptEvent: vi.fn().mockResolvedValue(undefined),
  retractMonthlyExcerptLikeNotification: vi.fn().mockResolvedValue(undefined),
}));

const getUser = vi.fn();
const excerptId = '10000000-0000-4000-8000-000000000001';
const commentId = '10000000-0000-4000-8000-0000000000c1';
const parentId = '10000000-0000-4000-8000-0000000000c2';
const ctx = (id = excerptId) => ({ params: Promise.resolve({ id }) });

type Result = { data?: unknown; error?: { code?: string; message?: string } | null };
type Call = { table: string; op: string; args: unknown[]; filters: [string, unknown][] };

/** 라우트가 쓰는 체인을 흉내 낸다. 테이블·동작별로 정해 둔 결과를 돌려주고 호출을 기록한다. */
function fake(results: Record<string, Result> = {}, canView: Result = { data: true }) {
  const calls: Call[] = [];
  const rpc = vi.fn(async () => ({ data: canView.data ?? null, error: canView.error ?? null }));
  const from = (table: string) => {
    const call: Call = { table, op: 'select', args: [], filters: [] };
    calls.push(call);
    const finish = async () => {
      const r = results[`${table}.${call.op}`] ?? {};
      return { data: r.data ?? null, error: r.error ?? null };
    };
    const chain: Record<string, unknown> = {
      then: (ok: (v: unknown) => unknown, no: (e: unknown) => unknown) => finish().then(ok, no),
      single: finish,
      maybeSingle: finish,
    };
    for (const name of ['eq', 'in', 'or', 'order', 'limit']) {
      chain[name] = (...args: unknown[]) => {
        call.filters.push([name, name === 'in' ? args[1] : args.length === 1 ? args[0] : args[1]]);
        if (name === 'eq') call.filters.push([`eq:${String(args[0])}`, args[1]]);
        return chain;
      };
    }
    chain.select = (...args: unknown[]) => {
      if (call.op === 'select') call.args = args;
      else call.filters.push(['returning', args[0]]);
      return chain;
    };
    chain.insert = (...args: unknown[]) => {
      call.op = 'insert';
      call.args = args;
      return chain;
    };
    chain.delete = () => {
      call.op = 'delete';
      return chain;
    };
    return chain;
  };
  const client = { from, rpc };
  vi.mocked(createSupabaseServerClient).mockResolvedValue(client as never);
  return { calls, rpc, client };
}
const of = (calls: Call[], table: string, op: string) =>
  calls.filter((c) => c.table === table && c.op === op);
const filter = (call: Call, column: string) =>
  call.filters.find(([k]) => k === `eq:${column}`)?.[1];

const req = (body?: unknown, url = 'http://localhost/x') =>
  new Request(url, {
    method: 'POST',
    body: body === undefined ? undefined : typeof body === 'string' ? body : JSON.stringify(body),
  });
const nocache = (res: Response) => expect(res.headers.get('Cache-Control')).toContain('no-store');

beforeEach(() => {
  vi.clearAllMocks();
  getUser.mockReset().mockResolvedValue({ data: { user: { id: 'me' } }, error: null });
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

describe('POST /api/monthly-excerpts/[id]/likes', () => {
  it('세션이 없으면 401이고 아무것도 하지 않는다', async () => {
    getUser.mockResolvedValue({ data: { user: null }, error: null });
    const { calls, rpc } = fake();
    const res = await POST_LIKE(req(), ctx());
    expect(res.status).toBe(401);
    expect((await res.json()).code).toBe('session_expired');
    expect(rpc).not.toHaveBeenCalled();
    expect(calls).toEqual([]);
  });

  it('형식이 틀린 id는 400이다', async () => {
    const { rpc } = fake();
    expect((await POST_LIKE(req(), ctx('nope'))).status).toBe(400);
    expect(rpc).not.toHaveBeenCalled();
  });

  it('볼 수 없는 권은 404이고 행도 알림도 건드리지 않는다', async () => {
    const { calls, rpc } = fake({}, { data: false });
    const res = await POST_LIKE(req(), ctx());
    expect(res.status).toBe(404);
    nocache(res);
    expect(rpc).toHaveBeenCalledWith('can_view_monthly_excerpt', { p_id: excerptId });
    expect(calls).toEqual([]);
    expect(notifyMonthlyExcerptEvent).not.toHaveBeenCalled();
  });

  it('확인에 실패하면 500이다(없음으로 오해하지 않는다)', async () => {
    fake({}, { error: { code: 'XX' } });
    expect((await POST_LIKE(req(), ctx())).status).toBe(500);
  });

  it('좋아요가 없으면 남기고 알림을 보낸다. 응답 모양은 기록 좋아요와 같다', async () => {
    const { calls, client } = fake();
    const res = await POST_LIKE(req(), ctx());
    expect(res.status).toBe(200);
    nocache(res);
    expect(await res.json()).toEqual({ message: 'liked', liked: true });
    const [insert] = of(calls, 'monthly_excerpt_likes', 'insert');
    expect(insert.args[0]).toEqual({ user_id: 'me', excerpt_id: excerptId });
    expect(notifyMonthlyExcerptEvent).toHaveBeenCalledWith(client, excerptId, 'excerpt_like');
  });

  it('좋아요가 있으면 지우고 알림을 거둔다', async () => {
    const { calls, client } = fake({
      'monthly_excerpt_likes.select': { data: { user_id: 'me' } },
      'monthly_excerpt_likes.delete': { data: [{ user_id: 'me' }] },
    });
    const res = await POST_LIKE(req(), ctx());
    expect(await res.json()).toEqual({ message: 'unliked', liked: false });
    const [del] = of(calls, 'monthly_excerpt_likes', 'delete');
    expect(filter(del, 'user_id')).toBe('me');
    expect(filter(del, 'excerpt_id')).toBe(excerptId);
    expect(retractMonthlyExcerptLikeNotification).toHaveBeenCalledWith(client, excerptId);
    expect(notifyMonthlyExcerptEvent).not.toHaveBeenCalled();
  });

  it('지워진 행이 없으면 성공으로 답하지 않고 알림도 건드리지 않는다', async () => {
    fake({
      'monthly_excerpt_likes.select': { data: { user_id: 'me' } },
      'monthly_excerpt_likes.delete': { data: [] },
    });
    const res = await POST_LIKE(req(), ctx());
    expect(res.status).toBe(404);
    expect((await res.json()).error).toBe('찾을 수 없는 발췌집이에요.');
    expect(retractMonthlyExcerptLikeNotification).not.toHaveBeenCalled();
  });

  it('동시에 두 번 눌러 이미 있으면 좋아요 상태로 답한다', async () => {
    fake({ 'monthly_excerpt_likes.insert': { error: { code: '23505' } } });
    const res = await POST_LIKE(req(), ctx());
    expect(res.status).toBe(200);
    expect((await res.json()).liked).toBe(true);
  });

  it('확인 직후 숨겨져 RLS가 막으면 404다', async () => {
    fake({ 'monthly_excerpt_likes.insert': { error: { code: '42501' } } });
    expect((await POST_LIKE(req(), ctx())).status).toBe(404);
    expect(notifyMonthlyExcerptEvent).not.toHaveBeenCalled();
  });
});

describe('GET /api/monthly-excerpts/[id]/likes', () => {
  it('볼 수 없으면 404다', async () => {
    fake({}, { data: false });
    expect((await GET_LIKES(req(), ctx())).status).toBe(404);
  });

  it('명단은 기록 좋아요와 같은 모양이고, 친구·본인만 링크가 열린다', async () => {
    fake({
      'monthly_excerpt_likes.select': {
        data: [
          { user_id: 'me', created_at: 't1' },
          { user_id: 'friend', created_at: 't2' },
          { user_id: 'other', created_at: 't3' },
        ],
      },
      'profiles.select': {
        data: [
          { id: 'me', name: '나', nickname: 'me', tag: '1' },
          { id: 'friend', name: '벗', nickname: 'f', tag: '2' },
          { id: 'other', name: '남', nickname: 'o', tag: '3' },
        ],
      },
      'friends.select': { data: [{ user_id: 'friend', friend_id: 'me' }] },
    });
    const res = await GET_LIKES(req(), ctx());
    nocache(res);
    expect(await res.json()).toEqual([
      { id: 'me', name: '나', nickname: 'me', tag: '1', liked_at: 't1', is_accessible: true },
      { id: 'friend', name: '벗', nickname: 'f', tag: '2', liked_at: 't2', is_accessible: true },
      { id: 'other', name: '남', nickname: 'o', tag: '3', liked_at: 't3', is_accessible: false },
    ]);
  });
});

describe('GET /api/monthly-excerpts/[id]/comments', () => {
  it('볼 수 없으면 404이고 댓글을 읽지 않는다', async () => {
    const { calls } = fake({}, { data: false });
    expect((await GET_COMMENTS(req(), ctx())).status).toBe(404);
    expect(calls).toEqual([]);
  });

  it('세션이 없으면 401이다', async () => {
    getUser.mockResolvedValue({ data: { user: null }, error: null });
    fake();
    expect((await GET_COMMENTS(req(), ctx())).status).toBe(401);
  });

  it('과거 순으로 프로필과 함께 주고, 멱등 키는 내려보내지 않는다', async () => {
    const rows = [{ id: commentId, content: '좋아요' }];
    const { calls } = fake({ 'monthly_excerpt_comments.select': { data: rows } });
    const res = await GET_COMMENTS(req(), ctx());
    nocache(res);
    expect(await res.json()).toEqual(rows);
    const [read] = of(calls, 'monthly_excerpt_comments', 'select');
    expect(read.args[0]).toContain('profile:profiles');
    expect(read.args[0]).not.toContain('client_comment_id');
    expect(filter(read, 'excerpt_id')).toBe(excerptId);
  });
});

describe('POST /api/monthly-excerpts/[id]/comments', () => {
  const saved = {
    id: commentId,
    excerpt_id: excerptId,
    user_id: 'me',
    content: '좋다',
    parent_id: null,
  };

  it('볼 수 없는 권에는 남기지 않는다(404)', async () => {
    const { calls } = fake({}, { data: false });
    const res = await POST_COMMENT(req({ content: '좋다' }), ctx());
    expect(res.status).toBe(404);
    expect(calls).toEqual([]);
    expect(notifyMonthlyExcerptEvent).not.toHaveBeenCalled();
  });

  it.each([
    ['빈 내용', { content: '   ' }],
    ['내용 없음', {}],
    ['문자열이 아닌 내용', { content: 3 }],
    ['잘못된 멱등 키', { content: '좋다', client_comment_id: 'x' }],
    ['잘못된 부모', { content: '좋다', parentId: 'x' }],
  ])('%s은 400이다', async (_, body) => {
    const { calls } = fake();
    expect((await POST_COMMENT(req(body), ctx())).status).toBe(400);
    expect(calls).toEqual([]);
  });

  it('읽을 수 없는 본문은 400이다', async () => {
    fake();
    expect((await POST_COMMENT(req('{'), ctx())).status).toBe(400);
  });

  it('저장한 댓글 id를 알림에 넘기고 그대로 돌려준다', async () => {
    const { calls, client } = fake({ 'monthly_excerpt_comments.insert': { data: saved } });
    const res = await POST_COMMENT(
      req({ content: '좋다', client_comment_id: commentId.toUpperCase() }),
      ctx()
    );
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual(saved);
    const [insert] = of(calls, 'monthly_excerpt_comments', 'insert');
    // 작성 훅은 응답 id가 멱등 키와 같은지 확인하므로 id도 같은 값이다
    expect(insert.args[0]).toEqual({
      id: commentId,
      client_comment_id: commentId,
      excerpt_id: excerptId,
      user_id: 'me',
      content: '좋다',
      parent_id: null,
    });
    expect(notifyMonthlyExcerptEvent).toHaveBeenCalledWith(
      client,
      excerptId,
      'excerpt_comment',
      commentId
    );
  });

  it('답글은 부모를 넘긴다. 부모가 다른 권에 있거나 없으면 400이다', async () => {
    const { calls } = fake({ 'monthly_excerpt_comments.insert': { data: saved } });
    await POST_COMMENT(req({ content: '좋다', parentId }), ctx());
    expect(
      (of(calls, 'monthly_excerpt_comments', 'insert')[0].args[0] as { parent_id: string })
        .parent_id
    ).toBe(parentId);

    vi.mocked(notifyMonthlyExcerptEvent).mockClear();
    fake({ 'monthly_excerpt_comments.insert': { error: { code: '23503' } } });
    expect((await POST_COMMENT(req({ content: '좋다', parentId }), ctx())).status).toBe(400);
    expect(notifyMonthlyExcerptEvent).not.toHaveBeenCalled();
  });

  it('확인 직후 숨겨져 RLS가 막으면 404다', async () => {
    fake({ 'monthly_excerpt_comments.insert': { error: { code: '42501' } } });
    expect((await POST_COMMENT(req({ content: '좋다' }), ctx())).status).toBe(404);
  });

  it('같은 키의 재시도는 기존 댓글을 돌려주고 알림을 다시 보내지 않는다', async () => {
    const { calls } = fake({
      'monthly_excerpt_comments.insert': { error: { code: '23505' } },
      'monthly_excerpt_comments.select': { data: saved },
    });
    const res = await POST_COMMENT(req({ content: '좋다', client_comment_id: commentId }), ctx());
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual(saved);
    const [read] = of(calls, 'monthly_excerpt_comments', 'select');
    expect(filter(read, 'client_comment_id')).toBe(commentId);
    expect(filter(read, 'user_id')).toBe('me');
    expect(notifyMonthlyExcerptEvent).not.toHaveBeenCalled();
  });

  it.each([
    ['내용이 다름', { content: '다른 말', parent_id: null, excerpt_id: excerptId }],
    ['권이 다름', { content: '좋다', parent_id: null, excerpt_id: parentId }],
    ['부모가 다름', { content: '좋다', parent_id: parentId, excerpt_id: excerptId }],
    ['내 댓글이 아님(읽히지 않음)', null],
  ])('같은 키에 %s이면 409다', async (_, existing) => {
    fake({
      'monthly_excerpt_comments.insert': { error: { code: '23505' } },
      'monthly_excerpt_comments.select': { data: existing && { ...saved, ...existing } },
    });
    const res = await POST_COMMENT(req({ content: '좋다', client_comment_id: commentId }), ctx());
    expect(res.status).toBe(409);
  });

  it('그 밖의 오류는 500이고 내부 메시지를 돌려주지 않는다', async () => {
    fake({ 'monthly_excerpt_comments.insert': { error: { code: 'XX', message: 'secret' } } });
    const res = await POST_COMMENT(req({ content: '좋다' }), ctx());
    expect(res.status).toBe(500);
    expect(JSON.stringify(await res.json())).not.toContain('secret');
  });
});

describe('DELETE /api/monthly-excerpts/[id]/comments', () => {
  const del = (id: string | null = commentId) =>
    new Request(`http://localhost/x${id ? `?id=${id}` : ''}`, { method: 'DELETE' });

  it('세션이 없으면 401이다', async () => {
    getUser.mockResolvedValue({ data: { user: null }, error: null });
    fake();
    expect((await DELETE_COMMENT(del(), ctx())).status).toBe(401);
  });

  it('id가 틀리면 400이다', async () => {
    const { calls } = fake();
    expect((await DELETE_COMMENT(del('nope'), ctx())).status).toBe(400);
    expect((await DELETE_COMMENT(del(null), ctx())).status).toBe(400);
    expect(calls).toEqual([]);
  });

  it('본인 댓글만, 이 권에서 지운다', async () => {
    const { calls } = fake({ 'monthly_excerpt_comments.delete': { data: [{ id: commentId }] } });
    const res = await DELETE_COMMENT(del(), ctx());
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ success: true });
    const [call] = of(calls, 'monthly_excerpt_comments', 'delete');
    expect(filter(call, 'id')).toBe(commentId);
    expect(filter(call, 'user_id')).toBe('me');
    expect(filter(call, 'excerpt_id')).toBe(excerptId);
  });

  it('지워진 행이 없으면(남의 댓글, 숨겨진 권) 404다', async () => {
    fake({ 'monthly_excerpt_comments.delete': { data: [] } });
    expect((await DELETE_COMMENT(del(), ctx())).status).toBe(404);
  });

  it('오류는 500이다', async () => {
    fake({ 'monthly_excerpt_comments.delete': { error: { code: 'XX' } } });
    expect((await DELETE_COMMENT(del(), ctx())).status).toBe(500);
  });
});
