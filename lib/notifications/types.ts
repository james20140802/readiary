// 서버(fetchNotifications)와 클라이언트 컴포넌트(SocialTab) 양쪽에서 참조하므로
// next/headers 등 서버 전용 코드를 끌어오지 않는 이 순수 상수/타입 파일에 둔다.
export const NOTIFICATIONS_LIMIT = 50;

export type NotificationType = 'friend_request' | 'friend_accept' | 'like' | 'comment';

export interface NotificationItem {
  id: string;
  type: NotificationType;
  createdAt: string;
  readAt: string | null;
  entryId: string | null;
  actorNickname: string;
  actorProfileImage: string | null;
}
