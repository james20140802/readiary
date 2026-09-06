import { isAvatarPath } from '@/lib/profile/avatarPath';

/** 쿠키로 인증하는 같은 출처 경로. 공개 URL·서명 URL·이미지 최적화 캐시를 사용하지 않는다. */
export const getImageUrl = (path: string | null) => {
  if (!path || !isAvatarPath(path)) return null;
  return `/api/profile-image?path=${encodeURIComponent(path)}`;
};
