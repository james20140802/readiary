import { toKSTDateString } from '@/lib/dates';
import { formatDateLabel } from '@/lib/share/format';
import type { NotificationType } from './types';

const MESSAGES: Record<NotificationType, (nickname: string) => string> = {
  friend_request: (n) => `${n}님이 친구 신청을 보냈어요`,
  friend_accept: (n) => `${n}님이 친구 신청을 수락했어요`,
  like: (n) => `${n}님이 내 문장을 좋아해요`,
  comment: (n) => `${n}님이 내 기록에 댓글을 남겼어요`,
};

export function buildNotificationMessage(type: NotificationType, nickname: string): string {
  return MESSAGES[type](nickname);
}

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

export function formatRelativeTime(iso: string, now: Date = new Date()): string {
  const diff = now.getTime() - new Date(iso).getTime();
  if (diff < MINUTE) return '방금 전';
  if (diff < HOUR) return `${Math.floor(diff / MINUTE)}분 전`;
  if (diff < DAY) return `${Math.floor(diff / HOUR)}시간 전`;
  if (diff < 7 * DAY) return `${Math.floor(diff / DAY)}일 전`;
  return formatDateLabel(toKSTDateString(new Date(iso)));
}
