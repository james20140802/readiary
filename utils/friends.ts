import { RawFriendRow, Friend } from '@/types/friends';

export function transformFriendRow(row: RawFriendRow, userId: string): Friend {
  const isSender = row.user_id === userId;

  const profile = isSender ? row.friend_profile : row.user_profile;

  return {
    profile: profile,
    accepted: row.status === 'accepted',
  };
}
