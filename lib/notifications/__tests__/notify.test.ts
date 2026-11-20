import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  notifyDebateEvent,
  notifyEntryEvent,
  notifyFriendEvent,
  notifyMonthlyExcerptEvent,
  retractDebateNotification,
  retractMonthlyExcerptLikeNotification,
} from '../notify';

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

describe('달의 발췌집 알림', () => {
  it('댓글은 댓글 id를 넘기고 좋아요는 키를 보내지 않는다', async () => {
    const supabase = buildSupabase();
    await notifyMonthlyExcerptEvent(supabase, 'x1', 'excerpt_comment', 'c1');
    expect(supabase.rpc).toHaveBeenLastCalledWith('notify_monthly_excerpt_event', {
      p_excerpt_id: 'x1',
      p_type: 'excerpt_comment',
      p_comment_id: 'c1',
    });
    await notifyMonthlyExcerptEvent(supabase, 'x1', 'excerpt_like');
    expect(supabase.rpc).toHaveBeenLastCalledWith('notify_monthly_excerpt_event', {
      p_excerpt_id: 'x1',
      p_type: 'excerpt_like',
    });
  });

  it('회수는 권 id로 부른다', async () => {
    const supabase = buildSupabase();
    await retractMonthlyExcerptLikeNotification(supabase, 'x1');
    expect(supabase.rpc).toHaveBeenCalledWith('retract_monthly_excerpt_like_notification', {
      p_excerpt_id: 'x1',
    });
  });

  it('RPC 오류는 로그만 남기고 던지지 않는다 — 반응은 이미 저장됐다', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    const supabase = buildSupabase({ message: 'boom' });
    await expect(
      notifyMonthlyExcerptEvent(supabase, 'x1', 'excerpt_like')
    ).resolves.toBeUndefined();
    await expect(retractMonthlyExcerptLikeNotification(supabase, 'x1')).resolves.toBeUndefined();
    expect(error).toHaveBeenCalledTimes(2);
  });
});

describe('문장 토론 알림', () => {
  it('종류와 대상만 넘긴다 — 수신자와 사실 확인은 RPC가 한다', async () => {
    const supabase = buildSupabase();
    await notifyDebateEvent(supabase, 'debate_reply', 'reply-1');
    expect(supabase.rpc).toHaveBeenCalledWith('notify_debate_event', {
      p_type: 'debate_reply',
      p_target: 'reply-1',
    });
  });

  it('거두기도 종류와 대상만 넘긴다', async () => {
    const supabase = buildSupabase();
    await retractDebateNotification(supabase, 'debate_move', 'answer-1');
    expect(supabase.rpc).toHaveBeenCalledWith('retract_debate_notification', {
      p_type: 'debate_move',
      p_target: 'answer-1',
    });
  });

  it('RPC 오류는 로그만 남기고 던지지 않는다 — 답은 이미 저장됐다', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    const supabase = buildSupabase({ message: 'boom' });
    await expect(notifyDebateEvent(supabase, 'debate_answer', 'a')).resolves.toBeUndefined();
    await expect(
      retractDebateNotification(supabase, 'debate_summary', 'd')
    ).resolves.toBeUndefined();
    expect(error).toHaveBeenCalledWith('notify_debate_event 실패:', 'boom');
    expect(error).toHaveBeenCalledWith('retract_debate_notification 실패:', 'boom');
  });

  it('연결이 끊겨 RPC가 던져도 삼킨다', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const supabase = {
      rpc: () => Promise.reject(new Error('network')),
    } as unknown as Parameters<typeof notifyDebateEvent>[0];
    await expect(notifyDebateEvent(supabase, 'debate_answer', 'a')).resolves.toBeUndefined();
    await expect(retractDebateNotification(supabase, 'debate_move', 'a')).resolves.toBeUndefined();
  });
});
