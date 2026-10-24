import { redirect } from 'next/navigation';

/** 예전 비밀번호 변경 주소 — 설정의 계정 구역에서 비밀번호 시트가 바로 열린다(#password) */
export default function UpdatePasswordRedirect(): never {
  redirect('/settings#password');
}
