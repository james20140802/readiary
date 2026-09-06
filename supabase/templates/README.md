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
| `reauthentication.html` | Reauthentication                          | `[Readiary] 본인 확인 코드`              |

## 링크 규칙

- 가입 확인·재설정 링크는 `{{ .ConfirmationURL }}`이 아니라
  `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=…` — 서버 착지(`app/auth/confirm/route.ts`)가
  `verifyOtp`로 세션을 세운다. token_hash 방식이라 가입한 브라우저가 아닌 기기에서 메일을 열어도 된다.
  - 가입 확인: `type=email`
  - 재설정: `type=recovery` → 착지가 `/update-password`로 보낸다(복구 세션만 통과).
- 가입 확인은 `&next={{ .RedirectTo }}`를 덧붙인다. 앱이 `emailRedirectTo`로 넘기는 값은
  `<origin>/auth/confirm?next=<복귀 경로>`이고, 착지는 같은 오리진일 때만 그 안의 `next`를 꺼내 쓴다
  (허용 목록에 없어 Site URL로 대체되면 홈). 가입은 `user_metadata.pending_redirect`에도 넣지만,
  로그인 화면의 "인증 메일 다시 보내기"(`auth.resend`)는 메타데이터를 못 건드리므로 이 통로가 필요하다.
  Redirect URLs 허용 목록에 `https://www.readiary.net/auth/confirm**`(또는 `/**`)가 있어야 한다 —
  OAuth 복귀도 같은 모양(`/auth/confirm?next=…`)을 쓴다.
- 재설정 링크에는 `next`를 싣지 않는다(착지가 항상 `/update-password`로 보낸다).
- 링크의 호스트는 늘 `{{ .SiteURL }}`(프로덕션)이다. 로컬·프리뷰에서 요청한 메일도 프로덕션 착지로 오고,
  착지는 `next` 안의 경로만 살린다. `{{ .RedirectTo }}`를 호스트로 쓰지 않는 이유: 허용 목록에 없으면
  Supabase가 조용히 Site URL로 바꿔 넣는데 Go 템플릿에서 그걸 분간할 수 없어 링크가 깨질 수 있다.
  `NEXT_PUBLIC_EMAIL_REDIRECT_TO`·`NEXT_PUBLIC_PASSWORD_RESET_REDIRECT_TO`는 옛 `{{ .ConfirmationURL }}`
  템플릿에서만 착지를 정한다.
- Password changed는 링크가 필요 없는 알림 — 버튼은 `{{ .SiteURL }}/reset-password?from=alert`로 가는 보조
  아웃라인. `from=alert`가 있으면 이 기기에 세션이 남아 있어도 프로필(현재 비밀번호 확인)로 보내지 않고
  이메일 재설정 폼을 그대로 보여 준다 — 남이 바꿨다면 현재 비밀번호를 모르기 때문.
- Reauthentication은 링크 없이 `{{ .Token }}`(6자리 코드)만 보여 준다. **Secure password change**가 켜져
  있을 때 Supabase가 오래된 세션(24시간 초과)의 비밀번호 변경에 요구하는 코드로, 프로필 → 비밀번호 변경
  화면이 거절을 받으면 `auth.reauthenticate()`로 보내고 입력 단계를 띄운다. 화면의 "현재 비밀번호 확인"은
  첫 관문이고, 훔친 세션으로 Auth API를 직접 부르는 경우를 막는 경계는 이 설정이다.

## 켜는 순서(사람 작업)

1. Authentication → Emails → Templates에서 **Confirm sign up**, **Reset password**, **Reauthentication**
   각각 제목을 위 표대로 바꾸고 Body에 해당 HTML을 통째로 붙여 넣기(기존 내용 지우고). Save.
2. 같은 화면의 **Password changed**(보안 알림 묶음)를 **enable** 하고 제목·Body를 같은 방식으로.
   보안 알림은 프로젝트 단위로 켜야 발송된다.
3. Authentication → Sign In / Providers → Email에서 **Secure password change**를 켠다. 켜기 전에
   Reauthentication 템플릿이 붙어 있어야 코드 메일이 이 디자인으로 나간다.
4. 확인: 재설정 화면에서 본인 이메일로 요청 → 받은 메일이 이 디자인이면 끝.
   Password changed는 프로필 → 비밀번호 변경을 한 번 해 보면 도착한다. 로그인한 지 24시간이 지난 세션으로
   비밀번호를 바꾸면 확인 코드 단계가 나타나고 Reauthentication 메일이 온다.

Site URL(Authentication → URL Configuration)이 `https://www.readiary.net`이어야 `{{ .SiteURL }}`이 맞게 찍힌다.
