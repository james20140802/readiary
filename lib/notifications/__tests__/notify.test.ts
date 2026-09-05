import { afterEach, describe, expect, it, vi } from 'vitest';
import { notifyEntryEvent, notifyFriendEvent } from '../notify';

type Rpc = { rpc: ReturnType<typeof vi.fn> };

function buildSupabase(error: { message: string } | null = null) {
  const rpc = vi.fn().mockResolvedValue({ data: null, error });
  // 헬퍼는 rpc만 쓴다 — 나머지 클라이언트 표면은 흉내 내지 않는다
  return { rpc } as unknown as Parameters<typeof notifyEntryEvent>[0] & Rpc;
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('notifyEntryEvent', () => {
  it('댓글 id를 받으면 p_comment_id로 넘겨 그 댓글 행에 알림을 매단다', async () => {
    const supabase = buildSupabase();
    await notifyEntryEvent(supabase, 'entry-1', 'comment', 'comment-9');
    expect(supabase.rpc).toHaveBeenCalledWith('notify_entry_event', {
      p_entry_id: 'entry-1',
      p_type: 'comment',
      p_comment_id: 'comment-9',
    });
  });

  it('댓글 id가 없으면 p_comment_id 키 자체를 보내지 않는다(구형 경로·좋아요)', async () => {
    const supabase = buildSupabase();
    await notifyEntryEvent(supabase, 'entry-1', 'like');
    expect(supabase.rpc).toHaveBeenCalledWith('notify_entry_event', {
      p_entry_id: 'entry-1',
      p_type: 'like',
    });
    expect(supabase.rpc.mock.calls[0][1]).not.toHaveProperty('p_comment_id');
  });

  it('RPC 오류는 로그만 남기고 던지지 않는다 — 댓글 저장은 이미 끝났다', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    const supabase = buildSupabase({ message: 'boom' });
    await expect(notifyEntryEvent(supabase, 'entry-1', 'comment', 'c')).resolves.toBeUndefined();
    expect(error).toHaveBeenCalledWith('notify_entry_event 실패:', 'boom');
  });
});

describe('notifyFriendEvent', () => {
  it('수신자와 종류만 넘긴다 — friends 행 연결은 RPC가 한다', async () => {
    const supabase = buildSupabase();
    await notifyFriendEvent(supabase, 'user-2', 'friend_request');
    expect(supabase.rpc).toHaveBeenCalledWith('notify_friend_event', {
      p_recipient: 'user-2',
      p_type: 'friend_request',
    });
  });
});
