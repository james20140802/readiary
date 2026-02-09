import { Profile } from './profile';

export type Comment = {
  content: string;
  created_at: string;
  entry_id: string;
  id: string;
  parent_id: string | null;
  user_id: string;
  profile: Profile;
};
