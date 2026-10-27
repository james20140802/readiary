'use client';

import { SettingsRow, SettingsSection, type TocItem } from './SettingsParts';

/** 설정 차례 — 시안 settings.html 순서. '이 기기'·'내 기록'은 시안의 제안이라 아직 두지 않는다 */
export const SETTINGS_TOC: TocItem[] = [
  { id: 'profile', label: '프로필' },
  { id: 'cover', label: '내 책의 표지' },
  { id: 'friends', label: '친구' },
  { id: 'push', label: '알림' },
  { id: 'account', label: '계정' },
  { id: 'about', label: '안내' },
];

export function FriendsSection({ onInvite }: { onInvite: () => void }) {
  return (
    <SettingsSection id="friends" title="친구">
      <div className="mt-3">
        <SettingsRow href="/social/friends">친구 관리</SettingsRow>
        <SettingsRow onClick={onInvite} value="readiary.net/invite/…" last>
          초대 링크 보내기
        </SettingsRow>
      </div>
    </SettingsSection>
  );
}

export function AccountSection({
  email,
  onPassword,
  onSignOut,
  signingOut,
}: {
  email: string | null;
  onPassword: () => void;
  onSignOut: () => void;
  signingOut: boolean;
}) {
  return (
    <SettingsSection id="account" title="계정">
      <div className="mt-3">
        {email && (
          <SettingsRow value={<span data-skeleton>{email}</span>} chevron={false}>
            이메일
          </SettingsRow>
        )}
        <SettingsRow id="password" onClick={onPassword}>
          비밀번호 바꾸기
        </SettingsRow>
        <SettingsRow onClick={onSignOut} disabled={signingOut} chevron={false} last>
          {signingOut ? '로그아웃하는 중…' : '로그아웃'}
        </SettingsRow>
      </div>
    </SettingsSection>
  );
}

export function AboutSection() {
  return (
    <SettingsSection id="about" title="안내">
      <div className="mt-3">
        <SettingsRow href="/terms">이용 약관</SettingsRow>
        <SettingsRow href="/privacy" last>
          개인정보처리방침
        </SettingsRow>
      </div>
    </SettingsSection>
  );
}
