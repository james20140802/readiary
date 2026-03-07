import { Profile } from '@/types/profile';
import { Avatar } from '../ui/Avatar';
import Link from 'next/link';
import BackButton from '../ui/BackButton';
import { getImageUrl } from '@/utils/profile';

interface Props {
  profile: Profile;
  showBackButton?: boolean;
}

export default function FriendProfileHeader({ profile, showBackButton = true }: Props) {
  return (
    <div className="mb-6 flex items-center">
      {showBackButton && <BackButton />}
      <Link
        href={`/protected/social/u/${profile.nickname + '-' + profile.tag}`}
        className={`flex items-center gap-4 ${!showBackButton && 'mb-4'} hover:opacity-80 transition ${showBackButton && 'mx-4'}`}
      >
        <Avatar
          src={getImageUrl(profile.profile_image || null) || undefined}
          alt="프로필 이미지"
          fallbackText={profile.nickname[0].toUpperCase()}
          size="md"
        />
        <div className={`${showBackButton && 'flex items-center gap-3'}`}>
          <p className="text-lg font-semibold text-label dark:text-label-invert">{profile.name}</p>
          <p className="text-sm text-label-sub dark:text-label-muted">
            {profile.nickname}#{profile.tag}
          </p>
        </div>
      </Link>
    </div>
  );
}
