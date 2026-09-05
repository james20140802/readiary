# Supabase 이메일 템플릿

Supabase Auth가 보내는 메일의 원본. 대시보드에 붙여 넣은 내용과 이 파일이 같아야 한다 — 문안을 고칠 때는
여기서 고치고 다시 붙여 넣는다. 붙여 넣는 곳: **Authentication → Emails → Templates**.

이메일은 Tailwind 토큰을 못 쓰므로 `app/globals.css`의 라이트 팔레트를 hex로 인라인했다. 그림자 없음,
헤어라인, 부리 제목, 알약 버튼 — 앱과 같은 규칙(`docs/ui-guidelines.md`).
다크 모드는 메일 클라이언트마다 처리가 달라 라이트 고정(`color-scheme: light`).

| 파일                    | 대시보드 템플릿                           | 제목(Subject)                            |
| ----------------------- | ----------------------------------------- | ---------------------------------------- |
| `confirm-signup.html`   | Confirm sign up                           | `[Readiary] 이메일 주소를 확인해 주세요` |
| `reset-password.html`   | Reset password                            | `[Readiary] 비밀번호 재설정 안내`        |
| `password-changed.html` | Password changed (Security notifications) | `[Readiary] 비밀번호가 변경되었습니다`   |

## 링크 규칙

- 가입 확인·재설정 링크는 `{{ .ConfirmationURL }}`이 아니라
  `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=…` — 서버 착지(`app/auth/confirm/route.ts`)가
  `verifyOtp`로 세션을 세운다. token_hash 방식이라 가입한 브라우저가 아닌 기기에서 메일을 열어도 된다.
  - 가입 확인: `type=email`
  - 재설정: `type=recovery` → 착지가 `/update-password`로 보낸다(복구 세션만 통과).
- `next`는 싣지 않는다. 착지의 `sanitizeRedirectPath`는 경로만 받고 `{{ .RedirectTo }}`는 절대 URL이라
  버려진다. 초대 링크 복귀는 `user_metadata.pending_redirect`로 관통한다.
- Password changed는 링크가 필요 없는 알림 — 버튼은 `{{ .SiteURL }}/reset-password`로 가는 보조 아웃라인.

## 켜는 순서(사람 작업)

1. Authentication → Emails → Templates에서 **Confirm sign up**, **Reset password** 각각 제목을 위 표대로
   바꾸고 Body에 해당 HTML을 통째로 붙여 넣기(기존 내용 지우고). Save.
2. 같은 화면의 **Password changed**(보안 알림 묶음)를 **enable** 하고 제목·Body를 같은 방식으로.
   보안 알림은 프로젝트 단위로 켜야 발송된다.
3. 확인: 재설정 화면에서 본인 이메일로 요청 → 받은 메일이 이 디자인이면 끝.
   Password changed는 프로필 → 비밀번호 변경을 한 번 해 보면 도착한다.

Site URL(Authentication → URL Configuration)이 `https://www.readiary.net`이어야 `{{ .SiteURL }}`이 맞게 찍힌다.
