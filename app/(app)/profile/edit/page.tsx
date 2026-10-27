import { redirect } from 'next/navigation';

/** 예전 프로필 수정 주소 — 설정의 프로필 구역으로 옮겼다. 설치된 앱·북마크의 링크가 깨지지 않게 남겨 둔다 */
export default function EditProfileRedirect(): never {
  redirect('/settings#profile');
}
