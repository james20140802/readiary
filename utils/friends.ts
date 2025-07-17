import { RawFriendRow, Friend } from '@/types/friends';

export function transformFriendRow(row: RawFriendRow, userId: string): Friend {
  const isSender = row.user_id === userId;

  const profile = isSender ? row.target?.[0] : row.profiles?.[0];
  return {
    id: row.id,
    accepted: row.status === 'accepted',
    nickname: profile?.nickname ?? '',
    tag: profile?.tag ?? '',
  };
}
