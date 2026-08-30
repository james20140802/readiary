import { describe, expect, it } from 'vitest';
import { buildNotificationMessage, formatRelativeTime } from '@/lib/notifications/format';

describe('buildNotificationMessage', () => {
  it('타입별 메시지를 만든다', () => {
    expect(buildNotificationMessage('friend_request', '상추')).toBe('상추님이 친구 신청을 보냈어요');
    expect(buildNotificationMessage('friend_accept', '상추')).toBe('상추님이 친구 신청을 수락했어요');
    expect(buildNotificationMessage('like', '상추')).toBe('상추님이 내 문장을 좋아해요');
    expect(buildNotificationMessage('comment', '상추')).toBe('상추님이 내 기록에 댓글을 남겼어요');
  });
});

describe('formatRelativeTime', () => {
  const now = new Date('2026-08-29T12:00:00+09:00');

  it('1분 미만은 방금 전', () => {
    expect(formatRelativeTime('2026-08-29T11:59:30+09:00', now)).toBe('방금 전');
  });
  it('1시간 미만은 n분 전', () => {
    expect(formatRelativeTime('2026-08-29T11:15:00+09:00', now)).toBe('45분 전');
  });
  it('하루 미만은 n시간 전', () => {
    expect(formatRelativeTime('2026-08-29T05:00:00+09:00', now)).toBe('7시간 전');
  });
  it('7일 미만은 n일 전', () => {
    expect(formatRelativeTime('2026-08-27T12:00:00+09:00', now)).toBe('2일 전');
  });
  it('7일 이상은 절대 날짜', () => {
    expect(formatRelativeTime('2026-08-01T12:00:00+09:00', now)).toBe('2026년 8월 1일');
  });
  it('절대 날짜는 시스템 로컬 타임존이 아닌 KST 기준(UTC로는 전날인 KST 새벽 시각)', () => {
    // KST 2026-08-01T02:00:00 == UTC 2026-07-31T17:00:00. UTC 런타임에서 로컬 Date 메서드를 쓰면
    // '2026년 7월 31일'로 하루 어긋난다 — KST 기준 '2026년 8월 1일'이어야 한다.
    expect(formatRelativeTime('2026-08-01T02:00:00+09:00', now)).toBe('2026년 8월 1일');
  });
  it('미래 타임스탬프(시계 오차)는 방금 전', () => {
    expect(formatRelativeTime('2026-08-29T12:00:30+09:00', now)).toBe('방금 전');
  });
});
