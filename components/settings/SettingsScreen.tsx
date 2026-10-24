'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import ActionNavigation from '@/components/ui/ActionNavigation';
import Sheet from '@/components/ui/Sheet';
import EmailSettings from '@/components/email/EmailSettings';
import { useTopBar } from '@/components/shell/TopBarContext';
import { useActionLock } from '@/hooks/useActionLock';
import { createSupabaseClient } from '@/lib/supabase/client';
import { disableDevicePush } from '@/lib/push/browser';
import { clearPwaCaches } from '@/lib/pwa/clear-caches';
import { buildInviteSlug } from '@/lib/social/invite';
import type { Profile } from '@/types/profile';
import PasswordChange from './PasswordChange';
import ProfileSettings from './ProfileSettings';
import PushSettings from './PushSettings';
import { AboutSection, AccountSection, FriendsSection, SETTINGS_TOC } from './Sections';
import { SettingsLayout, SettingsSection } from './SettingsParts';

/** 주소 끝이 #password면(예전 비밀번호 변경 주소에서 왔다) 비밀번호 시트를 바로 연다 */
const PASSWORD_HASH = '#password';

/**
 * 설정 — 프로필 고치기, 내 책의 표지, 친구, 알림(휴대폰·이메일), 계정(비밀번호·로그아웃), 안내.
 * 예전 /profile/edit, /profile/update-password, /notifications/settings 가 각 구역으로 이어진다.
 */
export default function SettingsScreen({
  profile,
  email,
}: {
  profile: Profile;
  email: string | null;
}) {
  useTopBar({ title: '설정', back: { href: '/profile', label: '나' } });
  const router = useRouter();
  const [passwordOpen, setPasswordOpen] = useState(false);

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
      />
      <ActionNavigation href={signOutLock.destination} />
      <AboutSection />

      <Sheet open={passwordOpen} onClose={closePassword} title="비밀번호 바꾸기">
        <PasswordChange onClose={closePassword} />
      </Sheet>
    </SettingsLayout>
  );
}
