import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { notifyEntryEvent } from '@/lib/notifications/notify';
import { DELETE, POST } from '../route';

vi.mock('@/lib/supabase/server', () => ({
  createSupabaseServerClient: vi.fn(),
}));

vi.mock('@/lib/notifications/notify', () => ({
  notifyEntryEvent: vi.fn().mockResolvedValue(undefined),
}));

type Row = Record<string, unknown> | null;
type Err = { message: string; code?: string } | null;

/**
 * 라우트가 쓰는 체인만 흉내 낸다.
 * POST:   comments.insert([...]).select(...).single()
 * DELETE: comments.delete().eq('id', …).eq('user_id', …)
 */
function buildSupabaseStub({
  user = { id: 'user-1' } as { id: string } | null,
  inserted = {
    id: 'comment-1',
    entry_id: '10000000-0000-4000-8000-000000000010',
    user_id: 'user-1',
    content: '좋다',
  } as Row,
  insertError = null as Err,
  deleteError = null as Err,
  existing = null as Row,
  entry = {
    id: '10000000-0000-4000-8000-000000000010',
    is_private: false,
    user_books: { user_id: 'user-1' },
  } as Row,
  entryError = null as Err,
  friendship = null as Row,
  friendshipError = null as Err,
} = {}) {
  const single = vi.fn().mockResolvedValue({ data: inserted, error: insertError });
  const select = vi.fn().mockReturnValue({ single });
  const insert = vi.fn().mockReturnValue({ select });

  const eqUser = vi.fn().mockResolvedValue({ error: deleteError });
  const eqId = vi.fn().mockReturnValue({ eq: eqUser });
  const del = vi.fn().mockReturnValue({ eq: eqId });

  const entryEq = vi
    .fn()
    .mockReturnValue({ maybeSingle: async () => ({ data: entry, error: entryError }) });
  const friendEq = vi.fn().mockReturnValue({
    limit: () => ({ maybeSingle: async () => ({ data: friendship, error: friendshipError }) }),
  });
  const friendOr = vi.fn().mockReturnValue({ eq: friendEq });
  const from = vi.fn((table: string) => {
    if (table === 'entries') return { select: () => ({ eq: entryEq }) };
    if (table === 'friends') return { select: () => ({ or: friendOr }) };
    if (table === 'comments')
      return {
        insert,
        delete: del,
        select: () => ({
          eq: () => ({
            eq: () => ({ maybeSingle: async () => ({ data: existing, error: null }) }),
          }),
        }),
      };
    throw new Error(`unexpected table ${table}`);
  });
  const getUser = vi.fn().mockResolvedValue({ data: { user }, error: null });

  return {
    stub: { auth: { getUser }, from },
    insert,
    del,
    eqId,
    eqUser,
    entryEq,
    friendEq,
    friendOr,
  };
}

function postRequest(body: unknown) {
  return new Request('http://localhost/api/comments', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

const mockedCreate = vi.mocked(createSupabaseServerClient);
const mockedNotify = vi.mocked(notifyEntryEvent);

beforeEach(() => {
  mockedNotify.mockClear();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('POST /api/comments', () => {
  it.each([false, true])('allows own records (private=%s)', async (is_private) => {
    const { stub, insert } = buildSupabaseStub({
      entry: { is_private, user_books: { user_id: 'user-1' } },
    });
    mockedCreate.mockResolvedValue(stub as never);
    expect(
      (
        await POST(
          postRequest({ entryId: '10000000-0000-4000-8000-000000000010', content: '좋다' })
        )
      ).status
    ).toBe(200);
    expect(insert).toHaveBeenCalledOnce();
    expect(stub.from).not.toHaveBeenCalledWith('friends');
  });

  it('allows an accepted friend public record and checks both friendship directions', async () => {
    const { stub, insert, friendEq, friendOr } = buildSupabaseStub({
      entry: { is_private: false, user_books: { user_id: 'friend-1' } },
      friendship: { id: 'friendship-1' },
    });
    mockedCreate.mockResolvedValue(stub as never);
    expect(
      (
        await POST(
          postRequest({ entryId: '10000000-0000-4000-8000-000000000010', content: '좋다' })
        )
      ).status
    ).toBe(200);
    expect(friendEq).toHaveBeenCalledWith('status', 'accepted');
    expect(friendOr).toHaveBeenCalledWith(
      'and(user_id.eq.user-1,friend_id.eq.friend-1),and(user_id.eq.friend-1,friend_id.eq.user-1)'
    );
    expect(insert).toHaveBeenCalledOnce();
  });

  it.each([
    ['missing or RLS-hidden', null],
    ['friend private', { is_private: true, user_books: { user_id: 'friend-1' } }],
    ['non-friend public', { is_private: false, user_books: { user_id: 'other' } }],
  ])('returns the same 404 for %s without inserting or notifying', async (_, entry) => {
    const { stub, insert } = buildSupabaseStub({ entry });
    mockedCreate.mockResolvedValue(stub as never);
    const res = await POST(
      postRequest({
        entryId: '10000000-0000-4000-8000-000000000010',
        content: '좋다',
        client_comment_id: '10000000-0000-4000-8000-000000000001',
      })
    );
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: '기록을 찾을 수 없습니다.' });
    expect(insert).not.toHaveBeenCalled();
    expect(stub.from).not.toHaveBeenCalledWith('comments');
    expect(mockedNotify).not.toHaveBeenCalled();
  });

  it.each(['entry', 'friendship'])(
    'keeps %s query failures distinct from inaccessible records',
    async (query) => {
      const { stub, insert } = buildSupabaseStub({
        entry: { is_private: false, user_books: { user_id: 'other' } },
        ...(query === 'entry'
          ? { entryError: { message: 'internal details' } }
          : { friendshipError: { message: 'internal details' } }),
      });
      mockedCreate.mockResolvedValue(stub as never);
      const res = await POST(
        postRequest({ entryId: '10000000-0000-4000-8000-000000000010', content: '좋다' })
      );
      expect(res.status).toBe(500);
      expect(await res.json()).toEqual({ error: '기록을 확인하지 못했습니다.' });
      expect(insert).not.toHaveBeenCalled();
      expect(mockedNotify).not.toHaveBeenCalled();
    }
  );

  it.each([undefined, null, 'invalid'])(
    'rejects invalid entry ID %s before querying',
    async (entryId) => {
      const { stub, insert } = buildSupabaseStub();
      mockedCreate.mockResolvedValue(stub as never);
      expect((await POST(postRequest({ entryId, content: '좋다' }))).status).toBe(400);
      expect(stub.from).not.toHaveBeenCalled();
      expect(insert).not.toHaveBeenCalled();
    }
  );

  it('returns 404 if final RLS denies insertion after the visibility check', async () => {
    const { stub } = buildSupabaseStub({
      inserted: null,
      insertError: { code: '42501', message: 'RLS denied' },
    });
    mockedCreate.mockResolvedValue(stub as never);
    const res = await POST(
      postRequest({ entryId: '10000000-0000-4000-8000-000000000010', content: '좋다' })
    );
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: '기록을 찾을 수 없습니다.' });
    expect(mockedNotify).not.toHaveBeenCalled();
  });

  it('저장한 댓글의 id를 알림에 넘긴다 — 댓글이 지워지면 알림도 따라 사라지도록', async () => {
    const { stub, insert } = buildSupabaseStub();
    mockedCreate.mockResolvedValue(stub as never);

    const res = await POST(
      postRequest({ entryId: '10000000-0000-4000-8000-000000000010', content: '좋다' })
    );

    expect(res.status).toBe(200);
    expect(insert).toHaveBeenCalledWith([
      {
        entry_id: '10000000-0000-4000-8000-000000000010',
        user_id: 'user-1',
        content: '좋다',
        parent_id: null,
      },
    ]);
    expect(mockedNotify).toHaveBeenCalledWith(
      stub,
      '10000000-0000-4000-8000-000000000010',
      'comment',
      'comment-1'
    );
  });

  it('replays the same own comment without notifying twice', async () => {
    const id = '10000000-0000-4000-8000-000000000001';
    const existing = {
      id,
      entry_id: '10000000-0000-4000-8000-000000000010',
      user_id: 'user-1',
      content: '좋다',
      parent_id: null,
    };
    const { stub } = buildSupabaseStub({
      inserted: null,
      insertError: { code: '23505', message: 'duplicate' },
      existing,
    });
    mockedCreate.mockResolvedValue(stub as never);
    const res = await POST(
      postRequest({
        entryId: '10000000-0000-4000-8000-000000000010',
        content: '좋다',
        client_comment_id: id,
      })
    );
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual(existing);
    expect(mockedNotify).not.toHaveBeenCalled();
  });

  it('replays uppercase UUIDs using their canonical entry and parent IDs', async () => {
    const id = 'aaaaaaaa-0000-4000-8000-000000000001';
    const entryId = 'bbbbbbbb-0000-4000-8000-000000000001';
    const parentId = 'cccccccc-0000-4000-8000-000000000001';
    const existing = {
      id,
      entry_id: entryId,
      user_id: 'user-1',
      content: '좋다',
      parent_id: parentId,
    };
    const { stub, insert } = buildSupabaseStub({
      inserted: null,
      insertError: { code: '23505', message: 'duplicate' },
      existing,
    });
    mockedCreate.mockResolvedValue(stub as never);
    const response = await POST(
      postRequest({
        entryId: entryId.toUpperCase(),
        parentId: parentId.toUpperCase(),
        client_comment_id: id.toUpperCase(),
        content: '좋다',
      })
    );
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(existing);
    expect(insert).toHaveBeenCalledWith([
      { id, entry_id: entryId, user_id: 'user-1', parent_id: parentId, content: '좋다' },
    ]);
    expect(mockedNotify).not.toHaveBeenCalled();
  });

  it.each([
    null,
    {
      user_id: 'other',
      entry_id: '10000000-0000-4000-8000-000000000010',
      parent_id: null,
      content: '좋다',
    },
    { user_id: 'user-1', entry_id: 'entry-2', parent_id: null, content: '좋다' },
    {
      user_id: 'user-1',
      entry_id: '10000000-0000-4000-8000-000000000010',
      parent_id: 'parent',
      content: '좋다',
    },
    {
      user_id: 'user-1',
      entry_id: '10000000-0000-4000-8000-000000000010',
      parent_id: null,
      content: 'changed',
    },
  ])('rejects inaccessible or conflicting replay %#', async (existing) => {
    const { stub } = buildSupabaseStub({
      inserted: null,
      insertError: { code: '23505', message: 'duplicate' },
      existing,
    });
    mockedCreate.mockResolvedValue(stub as never);
    const res = await POST(
      postRequest({
        entryId: '10000000-0000-4000-8000-000000000010',
        content: '좋다',
        client_comment_id: '10000000-0000-4000-8000-000000000001',
      })
    );
    expect(res.status).toBe(409);
    expect(mockedNotify).not.toHaveBeenCalled();
  });

  it('rejects malformed retry IDs before inserting', async () => {
    const { stub, insert } = buildSupabaseStub();
    mockedCreate.mockResolvedValue(stub as never);
    expect((await POST(postRequest({ client_comment_id: 'invalid' }))).status).toBe(400);
    expect(insert).not.toHaveBeenCalled();
  });

  it('로그인이 없으면 401이고 알림도 보내지 않는다', async () => {
    const { stub } = buildSupabaseStub({ user: null });
    mockedCreate.mockResolvedValue(stub as never);

    const res = await POST(
      postRequest({ entryId: '10000000-0000-4000-8000-000000000010', content: '좋다' })
    );

    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: 'Unauthorized', code: 'session_expired' });
    expect(mockedNotify).not.toHaveBeenCalled();
  });

  it('저장이 실패하면 500이고 알림도 보내지 않는다', async () => {
    const { stub } = buildSupabaseStub({ inserted: null, insertError: { message: 'rls' } });
    mockedCreate.mockResolvedValue(stub as never);

    const res = await POST(
      postRequest({ entryId: '10000000-0000-4000-8000-000000000010', content: '좋다' })
    );

    expect(res.status).toBe(500);
    expect(mockedNotify).not.toHaveBeenCalled();
  });
});

describe('DELETE /api/comments', () => {
  it('본인 댓글만 지운다 — 알림 회수 호출은 없다(DB cascade가 처리)', async () => {
    const { stub, eqId, eqUser } = buildSupabaseStub();
    mockedCreate.mockResolvedValue(stub as never);

    const res = await DELETE(
      new Request('http://localhost/api/comments?id=comment-1', { method: 'DELETE' })
    );

    expect(res.status).toBe(200);
    expect(eqId).toHaveBeenCalledWith('id', 'comment-1');
    expect(eqUser).toHaveBeenCalledWith('user_id', 'user-1');
    expect(mockedNotify).not.toHaveBeenCalled();
  });
});
