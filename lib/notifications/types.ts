// 서버(fetchNotifications)와 클라이언트 컴포넌트(NotificationsView) 양쪽에서 참조하므로
// next/headers 등 서버 전용 코드를 끌어오지 않는 이 순수 상수/타입 파일에 둔다.
export const NOTIFICATIONS_LIMIT = 50;

export type NotificationType =
  | 'friend_request'
  | 'friend_accept'
  | 'like'
  | 'comment'
  | 'excerpt_like'
  | 'excerpt_comment';

export interface NotificationItem {
  id: string;
  type: NotificationType;
  createdAt: string;
  readAt: string | null;
  entryId: string | null;
  /** 달의 발췌집 반응 알림이 가리키는 달('YYYY-MM'). 그 밖의 알림이나 권을 찾지 못하면 null */
  monthlyExcerptMonth: string | null;
  actorNickname: string;
  actorProfileImage: string | null;
}
