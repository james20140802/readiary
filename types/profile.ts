import { UserBadge } from './badges';
import { UserBookWithCover } from './book';

export type Profile = {
  id: string;
  name: string;
  nickname: string;
  tag: string;
  bio: string | null;
  created_at: string | null;
  profile_image: string | null;
};

export type ProfileFullData = {
  profile: Profile | null;
  userBooks: UserBookWithCover[];
  userBadges: UserBadge[];
};
