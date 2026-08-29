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
