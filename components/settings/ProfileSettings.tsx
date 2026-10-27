'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import ActionNavigation from '@/components/ui/ActionNavigation';
import ProfileSelection from '@/components/profile/ProfileSelection';
import FeaturedQuoteSelection from '@/components/profile/FeaturedQuoteSelection';
import { useProfileUpdate } from '@/hooks/useProfileUpdate';
import { createSupabaseClient } from '@/lib/supabase/client';
import { fetchAllRows } from '@/lib/supabase/fetchAllRows';
import { validateNickname } from '@/lib/profile/nickname';
import { getImageUrl } from '@/utils/profile';
import type { Profile } from '@/types/profile';
import { CoverFieldsView, ProfileFieldsView } from './ProfileFields';
import { SettingsSection } from './SettingsParts';

interface FinishedOption {
  id: string;
  title: string;
}

/**
 * 프로필과 내 책의 표지 — 예전 /profile/edit 의 동작 그대로 두 구역에 나눠 그린다.
 * 사진·이름·닉네임·소개와 표지 문장·책갈피는 한 번에 저장되고, 저장하면 '나' 화면으로 간다.
 * 표지 문장·책갈피는 바꾼 적이 있을 때만 저장에 실린다.
 */
export default function ProfileSettings({ profile }: { profile: Profile }) {
  const [supabase] = useState(createSupabaseClient);
  const [nickname, setNickname] = useState(profile.nickname || '');
  const [nicknameError, setNicknameError] = useState<string | null>(null);
  const [name, setName] = useState(profile.name || '');
  const [bio, setBio] = useState(profile.bio || '');
  const [featuredEntryId, setFeaturedEntryId] = useState<string | null>(
    profile.featured_entry_id ?? null
  );
  const [featuredDirty, setFeaturedDirty] = useState(false);
  const [bookmarkId, setBookmarkId] = useState<string | null>(
    profile.bookmark_user_book_id ?? null
  );
  const [bookmarkDirty, setBookmarkDirty] = useState(false);
  const [finishedBooks, setFinishedBooks] = useState<FinishedOption[]>([]);
  const [booksLoading, setBooksLoading] = useState(true);
  const [booksError, setBooksError] = useState(false);

  // 책갈피 후보 — 다른 목록과 따로 불러와 한쪽의 지연·실패가 다른 선택기를 막지 않는다.
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        // 완독 책은 행 캡에 잘리지 않도록 끝까지 읽는다 — 오래된 완독 책도 책갈피로 고를 수 있어야 한다
        const { rows: finished, error } = await fetchAllRows<{
          id: string;
          books: { title: string | null } | null;
        }>((from, to) =>
          supabase
            .from('user_books')
            .select('id, books(title)')
            .eq('user_id', profile.id)
            .eq('is_finished', true)
            .order('created_at', { ascending: false })
            .order('id', { ascending: true })
            .range(from, to)
        );
        if (!active) return;
        setBooksError(Boolean(error));
        setFinishedBooks(
          finished.flatMap((r) => (r.books?.title ? [{ id: r.id, title: r.books.title }] : []))
        );
      } catch {
        if (active) setBooksError(true);
      } finally {
        if (active) setBooksLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [supabase, profile.id]);

  const { destination, uploading, updating, imagePath, uploadAvatar, deleteAvatar, updateProfile } =
    useProfileUpdate(profile);

  const handleUploadAvatar = async (file: File) => {
    const res = await uploadAvatar(file);
    if (res?.success) toast.success('사진을 골랐어요. 고친 내용을 저장하면 바뀌어요.');
    else if (res?.error) toast.error(res.error);
  };

  const handleDeleteAvatar = async () => {
    const res = await deleteAvatar();
    if (res?.success) toast.success('사진을 뺐어요. 고친 내용을 저장하면 지워져요.');
    else if (res?.error) toast.error(res.error);
  };

  const handleSave = async () => {
    // 규칙 도입 전에 만든 닉네임은 그대로 두는 한 저장을 막지 않는다 — 바꿀 때만 검사
    const error = nickname !== profile.nickname ? validateNickname(nickname) : null;
    if (error) {
      setNicknameError(error);
      document.getElementById('profile-nickname')?.focus();
      return;
    }
    setNicknameError(null);
    const res = await updateProfile(
      nickname,
      name,
      bio,
      featuredDirty ? featuredEntryId : undefined,
      bookmarkDirty ? bookmarkId : undefined
    );
    if (res?.success) toast.success('프로필을 고쳤어요.');
    else if (res?.error) toast.error(res.error);
  };

  const avatarSrc = imagePath
    ? imagePath.startsWith('blob:')
      ? imagePath
      : getImageUrl(imagePath)
    : null;

  return (
    <>
      <SettingsSection id="profile" title="프로필" hideTitle first>
        <ProfileFieldsView
          avatarSrc={avatarSrc}
          displayName={profile.name || profile.nickname || '이름 없음'}
          handle={`${profile.nickname}#${profile.tag || '0000'}`}
          name={name}
          nickname={nickname}
          bio={bio}
          nicknameError={nicknameError}
          uploading={uploading}
          saving={updating}
          onName={setName}
          onNickname={(v) => {
            setNickname(v);
            if (nicknameError) setNicknameError(null);
          }}
          onBio={setBio}
          onPickAvatar={(file) => void handleUploadAvatar(file)}
          onRemoveAvatar={() => void handleDeleteAvatar()}
          onSave={() => void handleSave()}
        />
        <ActionNavigation href={destination} />
      </SettingsSection>

      <SettingsSection id="cover" title="내 책의 표지">
        <CoverFieldsView
          dirty={featuredDirty || bookmarkDirty}
          saving={updating}
          onSave={() => void handleSave()}
          quotePicker={
            <FeaturedQuoteSelection
              userId={profile.id}
              value={featuredEntryId}
              onChange={(id) => {
                setFeaturedEntryId(id);
                setFeaturedDirty(true);
              }}
              disabled={updating}
            />
          }
          bookmarkPicker={
            <ProfileSelection
              label="책갈피"
              options={finishedBooks}
              value={bookmarkId}
              onChange={(id) => {
                setBookmarkId(id);
                setBookmarkDirty(true);
              }}
              emptyLabel="책갈피를 꽂지 않아요"
              emptyMessage="아직 다 읽은 책이 없어요. 완독을 남기면 여기서 고를 수 있어요."
              searchPlaceholder="다 읽은 책 제목 찾기"
              loading={booksLoading}
              error={booksError}
              disabled={updating}
            />
          }
        />
      </SettingsSection>
    </>
  );
}
