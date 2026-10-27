import { redirect } from 'next/navigation';

/** 예전 알림 설정 주소 — 설정의 알림 구역(휴대폰·이메일)으로 옮겼다. 메일·알림의 링크가 깨지지 않게 남겨 둔다 */
export default function NotificationSettingsRedirect(): never {
  redirect('/settings#push');
}
