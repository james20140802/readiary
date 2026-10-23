'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import Button from '@/components/ui/Button';
import Sheet from '@/components/ui/Sheet';
import EmailConsentField from '@/components/email/EmailConsentField';
import ProfileSelection from '@/components/profile/ProfileSelection';
import { useTopBar } from '@/components/shell/TopBarContext';
import { CoverFieldsView, ProfileFieldsView } from '@/components/settings/ProfileFields';
import { PasswordFormView, type PasswordStep } from '@/components/settings/PasswordChange';
import { PushSettingsView } from '@/components/settings/PushSettings';
import {
  AboutSection,
  AccountSection,
  FriendsSection,
  SETTINGS_TOC,
} from '@/components/settings/Sections';
import { SettingsLayout, SettingsSection } from '@/components/settings/SettingsParts';
import type { PushKind } from '@/lib/push/types';

const QUOTES = [
  {
    id: 'q1',
    title: '생각이 깊어진다는 것은 무엇을 내려놓을지 알게 되는 일이다.',
    subtitle: '철학이 깊을수록 삶은 단순하다',
    groupId: 'g1',
  },
  {
    id: 'q2',
    title: '사랑은 가지는 것이 아니라 하는 것이다.',
    subtitle: '소유냐 존재냐',
    groupId: 'g2',
  },
  {
    id: 'q3',
    title: '경계와 문턱이 사라짐과 동시에 타자에 대한 환상도 사라진다.',
    subtitle: '에로스의 종말',
    groupId: 'g3',
  },
];
const FINISHED = [
  { id: 'f1', title: '왜 나는 너를 사랑하는가' },
  { id: 'f2', title: '정의란 무엇인가' },
  { id: 'f3', title: '작별하지 않는다' },
];

/** 설정 견본 — 실제 저장·불러오기 없이 모양과 키보드 조작만 확인한다 */
export default function SettingsLab({ pushState }: { pushState: 'on' | 'off' | 'loading' }) {
  useTopBar({ title: '설정', back: { href: '/design-lab/me/profile', label: '나' } });
  const [name, setName] = useState('테스트용계정');
  const [nickname, setNickname] = useState('readiary');
  const [bio, setBio] = useState('출퇴근길에 조금씩 읽어요. 철학책을 좋아해요.');
  const [quote, setQuote] = useState<string | null>('q1');
  const [bookmark, setBookmark] = useState<string | null>('f1');
  const [dirty, setDirty] = useState(false);
  const [kinds, setKinds] = useState<PushKind[]>(['reminder', 'recall', 'weekly']);
  const [emailOn, setEmailOn] = useState(false);
  const [pw, setPw] = useState<PasswordStep | 'no-password' | null>(null);

  const fake = (msg: string) => () => toast.success(`${msg} (견본)`);

  return (
    <SettingsLayout toc={SETTINGS_TOC}>
      <SettingsSection id="profile" title="프로필" hideTitle first>
        <ProfileFieldsView
          avatarSrc={null}
          displayName="테스트용계정"
          handle="readiary#0417"
          name={name}
          nickname={nickname}
          bio={bio}
          nicknameError={nickname.includes(' ') ? '닉네임에는 띄어쓰기를 쓸 수 없어요.' : null}
          uploading={false}
          saving={false}
          onName={setName}
          onNickname={setNickname}
          onBio={setBio}
          onPickAvatar={fake('사진을 골랐어요')}
          onRemoveAvatar={fake('사진을 뺐어요')}
          onSave={fake('프로필을 고쳤어요')}
        />
      </SettingsSection>
      <SettingsSection id="cover" title="내 책의 표지">
        <CoverFieldsView
          dirty={dirty}
          saving={false}
          onSave={fake('프로필을 고쳤어요')}
          quotePicker={
            <ProfileSelection
              label="표지 문장"
              options={QUOTES}
              value={quote}
              onChange={(id) => {
                setQuote(id);
                setDirty(true);
              }}
              emptyLabel="표지에 문장을 넣지 않아요"
              emptyMessage="아직 문장을 남긴 기록이 없어요."
              searchPlaceholder="책 제목이나 문장 검색"
              filterByBook
            />
          }
          bookmarkPicker={
            <ProfileSelection
              label="책갈피"
              options={FINISHED}
              value={bookmark}
              onChange={(id) => {
                setBookmark(id);
                setDirty(true);
              }}
              emptyLabel="책갈피를 꽂지 않아요"
              emptyMessage="아직 다 읽은 책이 없어요."
              searchPlaceholder="다 읽은 책 제목 찾기"
            />
          }
        />
      </SettingsSection>
      <FriendsSection onInvite={fake('초대 링크를 복사했어요')} />
      <SettingsSection id="push" title="알림">
        <PushSettingsView
          loaded={pushState !== 'loading'}
          busy={pushState === 'loading'}
          device={pushState === 'on'}
          enabled={pushState === 'on'}
          kinds={kinds}
          testAvailable
          scheduledAvailable={false}
          disabledReason={pushState === 'loading' ? '설정을 불러오는 중이에요.' : ''}
          onToggleKind={(k, on) => setKinds(on ? [...kinds, k] : kinds.filter((x) => x !== k))}
          onEnable={fake('이 기기에서 알림을 받을 준비가 됐어요')}
          onSave={fake('알림 설정을 저장했어요')}
          onStop={fake('알림을 껐어요')}
          onTest={fake('시험 알림을 보냈어요')}
        />
        <section aria-labelledby="lab-email" className="mt-8 space-y-3">
          <h3 id="lab-email" className="font-sans text-[17px] font-semibold text-ink">
            이메일 소식
          </h3>
          <EmailConsentField checked={emailOn} onChange={setEmailOn} email="reader@example.test" />
          <Button size="sm" variant="secondary" onClick={fake('이메일 설정을 저장했어요')}>
            이메일 설정 저장
          </Button>
        </section>
      </SettingsSection>
      <AccountSection
        email="read•••@example.com"
        onPassword={() => setPw('form')}
        onSignOut={fake('로그아웃했어요')}
        signingOut={false}
      />
      <div className="mt-3 flex flex-wrap gap-2">
        <Button size="sm" variant="ghost" onClick={() => setPw('code')}>
          견본: 확인 코드 단계
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setPw('no-password')}>
          견본: 소셜 로그인 계정
        </Button>
      </div>
      <AboutSection />

      <Sheet open={pw !== null} onClose={() => setPw(null)} title="비밀번호 바꾸기">
        <PasswordFormView
          account={
            pw === 'no-password'
              ? { state: 'no-password' }
              : { state: 'password', email: 'reader@example.test' }
          }
          step={pw === 'code' ? 'code' : 'form'}
          currentPassword=""
          password=""
          confirmPassword=""
          code=""
          currentError={null}
          newError={null}
          codeError={null}
          formError={null}
          loading={false}
          resending={false}
          onCurrentPassword={() => {}}
          onPassword={() => {}}
          onConfirmPassword={() => {}}
          onCode={() => {}}
          onSubmitForm={(e) => e.preventDefault()}
          onSubmitCode={(e) => e.preventDefault()}
          onResend={() => {}}
          onBackToForm={() => setPw('form')}
          onClose={() => setPw(null)}
        />
      </Sheet>
    </SettingsLayout>
  );
}
