import clsx from 'clsx';
import { Avatar } from '@/components/ui/Avatar';
import { getImageUrl } from '@/utils/profile';

interface Props {
  profile: { nickname: string; profile_image?: string | null };
  className?: string;
}

/** 친구 줄의 둥근 얼굴 — 시안 .av 44px */
export default function FriendAvatar({ profile, className }: Props) {
  return (
    <Avatar
      src={getImageUrl(profile.profile_image ?? null) || undefined}
      alt=""
      fallbackText={profile.nickname.charAt(0).toUpperCase()}
      className={clsx('!h-11 !w-11 shrink-0 !border-0 !bg-hairline', className)}
    />
  );
}
