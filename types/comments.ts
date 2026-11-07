import { Profile } from './profile';

export type Comment = {
  content: string;
  created_at: string;
  /** 기록에 단 댓글 */
  entry_id?: string;
  /** 달의 발췌집에 단 댓글 */
  excerpt_id?: string;
  id: string;
  parent_id: string | null;
  user_id: string;
  profile: Profile;
};
