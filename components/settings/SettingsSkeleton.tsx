'use client';

import { filler, SkeletonScope } from '@/components/ui/Skeleton';
import ProfileSelection from '@/components/profile/ProfileSelection';
import FeaturedQuoteSelection from '@/components/profile/FeaturedQuoteSelection';
import { EmailSettingsView } from '@/components/email/EmailSettings';
import { useTopBar } from '@/components/shell/TopBarContext';
import { CoverFieldsView, ProfileFieldsView } from './ProfileFields';
import { PushSettingsView } from './PushSettings';
import { AboutSection, AccountSection, FriendsSection, SETTINGS_TOC } from './Sections';
import { SettingsLayout, SettingsSection } from './SettingsParts';

const noop = () => {};

/** 설정을 불러오는 동안 — 실제 설정 화면 조각을 자리용 데이터로 그린다. 이 기기 알림·이메일 소식은
 * 실제 화면에서도 저마다 따로 불러오므로, 그 첫 모습(불러오는 중)을 그대로 쓴다. */
export default function SettingsSkeleton() {
  useTopBar({ title: '설정', back: { href: '/profile', label: '나' } });
  return (
    <SkeletonScope label="설정을 펼치는 중">
      {/* 이름·닉네임·소개 칸은 저장된 값이 채워진 채 열린다 — 그 값 자리를 막대로 */}
      <div data-skeleton-fields>
        <SettingsLayout toc={SETTINGS_TOC}>
          <SettingsSection id="profile" title="프로필" hideTitle first>
            <ProfileFieldsView
              avatarSrc={null}
              displayName={filler(5)}
              handle={`${filler(6)}#0000`}
              name={filler(5)}
              nickname={filler(6)}
              bio={filler(20)}
              nicknameError={null}
              uploading={false}
              saving={false}
              onName={noop}
              onNickname={noop}
              onBio={noop}
              onPickAvatar={noop}
              onRemoveAvatar={noop}
              onSave={noop}
            />
          </SettingsSection>

          <SettingsSection id="cover" title="내 책의 표지">
            <CoverFieldsView
              dirty={false}
              saving={false}
              onSave={noop}
              quotePicker={
                <FeaturedQuoteSelection userId="" value={null} onChange={noop} disabled />
              }
              bookmarkPicker={
                <ProfileSelection
                  label="책갈피"
                  options={[]}
                  value={null}
                  onChange={noop}
                  emptyLabel="책갈피를 꽂지 않아요"
                  emptyMessage="아직 다 읽은 책이 없어요. 완독을 남기면 여기서 고를 수 있어요."
                  searchPlaceholder="다 읽은 책 제목 찾기"
                  loading
                  disabled
                />
              }
            />
          </SettingsSection>

          <FriendsSection onInvite={noop} />

          <SettingsSection id="push" title="알림">
            <PushSettingsView
              loaded={false}
              busy
              device={false}
              enabled={false}
              kinds={[]}
              testAvailable={false}
              scheduledAvailable={false}
              disabledReason="설정을 불러오는 중이에요."
              onToggleKind={noop}
              onEnable={noop}
              onSave={noop}
              onStop={noop}
              onTest={noop}
            />
            <div className="mt-8">
              <EmailSettingsView
                busy
                unavailable={false}
                loaded={null}
                checked={false}
                conflict={false}
                hasAttempt={false}
                error=""
                message=""
                onChange={noop}
                onSave={noop}
                onRetry={noop}
              />
            </div>
          </SettingsSection>

          <AccountSection
            email={`${filler(4)}•••@example.com`}
            onPassword={noop}
            onSignOut={noop}
            signingOut={false}
          />

          <AboutSection />
        </SettingsLayout>
      </div>
    </SkeletonScope>
  );
}
