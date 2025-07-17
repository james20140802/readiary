export type RawFriendRow = {
  id: string;
  user_id: string;
  friend_id: string;
  status: string;
  accepted_at: string | null;
  profiles?: { nickname: string; tag: string }[];
  target?: { nickname: string; tag: string }[];
};

export interface Friend {
  id: string;
  nickname: string;
  tag: string;
  accepted: boolean;
}
