import { Profile } from './profile';

export type RawFriendRow = {
  id: string;
  user_id: string;
  friend_id: string;
  status: string;
  accepted_at: string | null;
  user_profile: Profile;
  friend_profile: Profile;
};

export interface Friend {
  profile: Profile;
  accepted: boolean;
  isRecipient: boolean;
}
