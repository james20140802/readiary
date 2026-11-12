'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import ActionNavigation from '@/components/ui/ActionNavigation';
import Sheet from '@/components/ui/Sheet';
import EmailSettings from '@/components/email/EmailSettings';
import { useTopBar } from '@/components/shell/TopBarContext';
import { useActionLock } from '@/hooks/useActionLock';
import { isAccountDeletionOpen } from '@/lib/account/deletion';
import { createSupabaseClient } from '@/lib/supabase/client';
import { disableDevicePush } from '@/lib/push/browser';
import { clearPwaCaches } from '@/lib/pwa/clear-caches';
import { buildInviteSlug } from '@/lib/social/invite';
import type { Profile } from '@/types/profile';
import AccountDeletionSheet from './AccountDeletionSheet';
import PasswordChange from './PasswordChange';
import ProfileSettings from './ProfileSettings';
import PushSettings from './PushSettings';
import { AboutSection, AccountSection, FriendsSection, SETTINGS_TOC } from './Sections';
import { SettingsLayout, SettingsSection } from './SettingsParts';

/** 주소 끝이 #password면(예전 비밀번호 변경 주소에서 왔다) 비밀번호 시트를 바로 연다 */
const PASSWORD_HASH = '#password';
/** 소셜 로그인으로 다시 확인받고 돌아오면 주소에 ?delete=1 이 붙어 있다 — 탈퇴 시트를 연 채로 시작한다 */
const DELETE_PARAM = 'delete';

/**
 * 설정 — 프로필 고치기, 내 책의 표지, 친구, 알림(휴대폰·이메일), 계정(비밀번호·로그아웃·탈퇴), 안내.
 * 예전 /profile/edit, /profile/update-password, /notifications/settings 가 각 구역으로 이어진다.
 */
export default function SettingsScreen({
  profile,
  email,
  hasPassword,
}: {
  profile: Profile;
  email: string | null;
  /** 이메일·비밀번호 계정인지 — 탈퇴할 때 비밀번호로 본인을 확인한다 */
  hasPassword: boolean;
}) {
  useTopBar({ title: '설정', back: { href: '/profile', label: '나' } });
  const router = useRouter();
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [deletionOpen, setDeletionOpen] = useState(false);
  // 시행일 전에는 탈퇴 행을 두지 않는다
  const deletionAvailable = isAccountDeletionOpen();

  useEffect(() => {
    if (!deletionAvailable) return;
    if (new URLSearchParams(window.location.search).get(DELETE_PARAM) === '1') {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- 주소는 마운트 뒤에만 읽을 수 있다
      setDeletionOpen(true);
    }
  }, [deletionAvailable]);

  const closeDeletion = () => {
    setDeletionOpen(false);
    // 닫은 뒤 새로고침해도 다시 열리지 않게 주소의 ?delete=1 을 지운다
    const url = new URL(window.location.href);
    if (url.searchParams.has(DELETE_PARAM)) {
      url.searchParams.delete(DELETE_PARAM);
      history.replaceState(null, '', `${url.pathname}${url.search}${url.hash}`);
    }
  };

  useEffect(() => {
    const openFromHash = () => {
      if (window.location.hash === PASSWORD_HASH) setPasswordOpen(true);
    };
    openFromHash();
    window.addEventListener('hashchange', openFromHash);
    return () => window.removeEventListener('hashchange', openFromHash);
  }, []);

  const closePassword = () => {
    setPasswordOpen(false);
    // 닫은 뒤 새로고침해도 다시 열리지 않게 주소의 #password 를 지운다
    if (window.location.hash === PASSWORD_HASH) {
      history.replaceState(null, '', `${window.location.pathname}${window.location.search}`);
    }
  };

  const shareInvite = async () => {
    const url = `${window.location.origin}/invite/${encodeURIComponent(
      buildInviteSlug(profile.nickname, profile.tag)
    )}`;
    try {
      if (typeof navigator.share === 'function') {
        await navigator.share({ title: 'Readiary에서 친구 맺기', url });
      } else {
        await navigator.clipboard.writeText(url);
        toast.success('초대 링크를 복사했어요.');
      }
    } catch (error) {
      if ((error as DOMException)?.name !== 'AbortError') {
        toast.error('초대 링크를 보내지 못했어요. 다시 시도해 주세요.');
      }
    }
  };

  const signOutLock = useActionLock();
  const handleSignOut = async () => {
    if (!signOutLock.acquire()) return;
    let navigating = false;
    try {
      const supabase = createSupabaseClient();
      await disableDevicePush().catch(() => {});
      const { error } = await supabase.auth.signOut({ scope: 'local' });
      if (error) throw error;
      await clearPwaCaches();
      navigating = true;
      signOutLock.navigate('/login');
      router.push('/login');
      router.refresh();
    } catch {
      toast.error('로그아웃을 완료하지 못했어요. 다시 시도해 주세요.');
    } finally {
      if (!navigating) signOutLock.release();
    }
  };

  return (
    <SettingsLayout toc={SETTINGS_TOC}>
      <ProfileSettings profile={profile} />
      <FriendsSection onInvite={() => void shareInvite()} />
      <SettingsSection id="push" title="알림">
        <PushSettings />
        <div className="mt-8">
          <EmailSettings />
        </div>
      </SettingsSection>
      <AccountSection
        email={email}
        onPassword={() => setPasswordOpen(true)}
        onSignOut={() => void handleSignOut()}
        signingOut={signOutLock.busy}
        onDelete={deletionAvailable ? () => setDeletionOpen(true) : undefined}
      />
      <ActionNavigation href={signOutLock.destination} />
      <AboutSection />

      <Sheet open={passwordOpen} onClose={closePassword} title="비밀번호 바꾸기">
        <PasswordChange onClose={closePassword} />
      </Sheet>
      {deletionAvailable && (
        <AccountDeletionSheet
          open={deletionOpen}
          onClose={closeDeletion}
          hasPassword={hasPassword}
          maskedEmail={email}
        />
      )}
    </SettingsLayout>
  );
}
