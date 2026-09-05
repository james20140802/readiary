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
type Err = { message: string } | null;

/**
 * 라우트가 쓰는 체인만 흉내 낸다.
 * POST:   comments.insert([...]).select(...).single()
 * DELETE: comments.delete().eq('id', …).eq('user_id', …)
 */
function buildSupabaseStub({
  user = { id: 'user-1' } as { id: string } | null,
  inserted = { id: 'comment-1', entry_id: 'entry-1', user_id: 'user-1', content: '좋다' } as Row,
  insertError = null as Err,
  deleteError = null as Err,
} = {}) {
  const single = vi.fn().mockResolvedValue({ data: inserted, error: insertError });
  const select = vi.fn().mockReturnValue({ single });
  const insert = vi.fn().mockReturnValue({ select });

  const eqUser = vi.fn().mockResolvedValue({ error: deleteError });
  const eqId = vi.fn().mockReturnValue({ eq: eqUser });
  const del = vi.fn().mockReturnValue({ eq: eqId });

  const from = vi.fn((table: string) => {
    if (table === 'comments') return { insert, delete: del };
    throw new Error(`unexpected table ${table}`);
  });
  const getUser = vi.fn().mockResolvedValue({ data: { user }, error: null });

  return { stub: { auth: { getUser }, from }, insert, del, eqId, eqUser };
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
  it('저장한 댓글의 id를 알림에 넘긴다 — 댓글이 지워지면 알림도 따라 사라지도록', async () => {
    const { stub, insert } = buildSupabaseStub();
    mockedCreate.mockResolvedValue(stub as never);

    const res = await POST(postRequest({ entryId: 'entry-1', content: '좋다' }));

    expect(res.status).toBe(200);
    expect(insert).toHaveBeenCalledWith([
      { entry_id: 'entry-1', user_id: 'user-1', content: '좋다', parent_id: null },
    ]);
    expect(mockedNotify).toHaveBeenCalledWith(stub, 'entry-1', 'comment', 'comment-1');
  });

  it('로그인이 없으면 401이고 알림도 보내지 않는다', async () => {
    const { stub } = buildSupabaseStub({ user: null });
    mockedCreate.mockResolvedValue(stub as never);

    const res = await POST(postRequest({ entryId: 'entry-1', content: '좋다' }));

    expect(res.status).toBe(401);
    expect(mockedNotify).not.toHaveBeenCalled();
  });

  it('저장이 실패하면 500이고 알림도 보내지 않는다', async () => {
    const { stub } = buildSupabaseStub({ inserted: null, insertError: { message: 'rls' } });
    mockedCreate.mockResolvedValue(stub as never);

    const res = await POST(postRequest({ entryId: 'entry-1', content: '좋다' }));

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
