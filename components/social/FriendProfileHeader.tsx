import { Profile } from '@/types/profile';
import { Avatar } from '../ui/Avatar';

interface Props {
  profile: Profile;
}

export default function FriendProfileHeader({ profile }: Props) {
  return (
    <div className="mb-6 flex items-center gap-4">
      <Avatar
        src={profile.profile_image || undefined}
        alt="프로필 이미지"
        fallbackText={profile.nickname[0]}
        size="lg"
      />
      <div>
        <p className="text-lg font-semibold text-gray-900 dark:text-white">{profile.name}</p>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {profile.nickname}#{profile.tag}
        </p>
      </div>
    </div>
  );
}
