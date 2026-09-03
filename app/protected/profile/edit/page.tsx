'use client';

import { useState, useEffect } from 'react';
import { Camera, Loader2, X } from 'lucide-react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { createSupabaseClient } from '@/lib/supabase/client';
import { fetchAllRows } from '@/lib/supabase/fetchAllRows';
import { useProfileUpdate } from '@/hooks/useProfileUpdate';
import { Profile } from '@/types/profile';
import BackButton from '@/components/ui/BackButton';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import FormGroup from '@/components/ui/FormGroup';
import FormLabel from '@/components/ui/FormLabel';
import { toast } from 'sonner';
import { getImageUrl } from '@/utils/profile';
import { validateNickname } from '@/lib/profile/nickname';

interface QuoteOption {
  id: string;
  quote: string;
  bookTitle: string | null;
}

interface FinishedOption {
  id: string;
  title: string;
}

/** 뒷표지 후보로 보여 주는 최근 인용 수 */
const FEATURED_CANDIDATES = 40;

export default function EditProfilePage() {
  const router = useRouter();
  const supabase = createSupabaseClient();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [nickname, setNickname] = useState('');
  const [nicknameError, setNicknameError] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [bio, setBio] = useState('');
  // 뒷표지 문장 — 내가 남긴 인용 중 하나. 바꾼 적이 있을 때만 저장에 실린다
  const [featuredEntryId, setFeaturedEntryId] = useState<string | null>(null);
  const [featuredDirty, setFeaturedDirty] = useState(false);
  const [quotes, setQuotes] = useState<QuoteOption[]>([]);
  // 책갈피 — 완독한 책 중 하나. 바꾼 적이 있을 때만 저장에 실린다
  const [bookmarkId, setBookmarkId] = useState<string | null>(null);
  const [bookmarkDirty, setBookmarkDirty] = useState(false);
  const [finishedBooks, setFinishedBooks] = useState<FinishedOption[]>([]);

  useEffect(() => {
    async function loadData() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return router.push('/login');

      const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single();
      if (data) {
        setProfile(data);
        setNickname(data.nickname || '');
        setName(data.name || '');
        setBio(data.bio || '');
        setFeaturedEntryId(data.featured_entry_id ?? null);
        setBookmarkId(data.bookmark_user_book_id ?? null);
      }

      // 완독 책은 행 캡에 잘리지 않도록 끝까지 읽는다 — 오래된 완독 책도 책갈피로 고를 수 있어야 한다
      const { rows: finished } = await fetchAllRows<{
        id: string;
        books: { title: string | null } | null;
      }>((from, to) =>
        supabase
          .from('user_books')
          .select('id, books(title)')
          .eq('user_id', user.id)
          .eq('is_finished', true)
          .order('created_at', { ascending: false })
          .order('id', { ascending: true })
          .range(from, to)
      );
      setFinishedBooks(
        finished.flatMap((r) => (r.books?.title ? [{ id: r.id, title: r.books.title }] : []))
      );

      const { data: rows } = await supabase
        .from('entries')
        .select('id, quote, date, user_books!inner(user_id, books(title))')
        .eq('user_books.user_id', user.id)
        .not('quote', 'is', null)
        .order('date', { ascending: false })
        .limit(FEATURED_CANDIDATES);
      setQuotes(
        (rows ?? []).flatMap((r) =>
          r.quote && r.quote.trim() !== ''
            ? [{ id: r.id, quote: r.quote, bookTitle: r.user_books?.books?.title ?? null }]
            : []
        )
      );
    }
    loadData();
  }, [supabase, router]);

  const { uploading, updating, imagePath, uploadAvatar, deleteAvatar, updateProfile } =
    useProfileUpdate(profile);

  const handleUploadAvatar = async (file: File) => {
    const res = await uploadAvatar(file);
    if (res?.success) {
      toast.success('프로필 이미지가 변경되었습니다.');
    } else if (res?.error) {
      toast.error(res.error);
    }
  };

  const handleDeleteAvatar = async () => {
    const res = await deleteAvatar();
    if (res?.success) {
      toast.success('프로필 이미지가 삭제되었습니다.');
    } else if (res?.error) {
      toast.error(res.error);
    }
  };

  const handleUpdateProfile = async () => {
    const error = validateNickname(nickname);
    if (error) {
      setNicknameError(error);
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
    if (res?.success) {
      toast.success('프로필 정보가 저장되었습니다.');
    } else if (res?.error) {
      toast.error(res.error);
    }
  };

  if (!profile)
    return (
      <div className="p-20 text-center">
        <Loader2 className="animate-spin mx-auto" />
      </div>
    );

  return (
    <main>
      <header className="flex items-center mb-6">
        <BackButton />
        <h1 className="text-page-title font-black text-ink ml-4">프로필 수정</h1>
      </header>

      <div className="space-y-10">
        {/* 이미지 수정 섹션 */}
        <section className="flex flex-col items-center sm:flex-row gap-8">
          <div className="relative group shrink-0">
            <div className="w-32 h-32 rounded-2xl overflow-hidden bg-card-raised border-2 border-hairline relative">
              {imagePath ? (
                <>
                  <Image
                    src={getImageUrl(imagePath) || ''}
                    alt="Avatar"
                    fill
                    className="object-cover"
                  />
                  <button
                    onClick={handleDeleteAvatar}
                    disabled={uploading}
                    className="absolute top-2 right-2 p-1 bg-black/50 text-white rounded-full hover:bg-black/70 transition-colors z-10"
                    title="이미지 삭제"
                  >
                    <X size={14} strokeWidth={2.5} />
                  </button>
                </>
              ) : (
                <div className="w-full h-full flex items-center justify-center text-ink-faint font-black text-4xl uppercase">
                  {nickname?.at(0) || 'U'}
                </div>
              )}
              {uploading && (
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                  <Loader2 className="animate-spin text-white" />
                </div>
              )}
            </div>
            <label className="absolute bottom-0 right-0 p-2.5 bg-ink text-ink-invert rounded-2xl cursor-pointer border border-hairline-strong hover:scale-110 transition-transform">
              <Camera size={18} strokeWidth={2.5} />
              <input
                type="file"
                className="hidden"
                accept="image/*"
                onChange={(e) => e.target.files?.[0] && handleUploadAvatar(e.target.files[0])}
                disabled={uploading}
              />
            </label>
          </div>
          <div className="text-center sm:text-left">
            <h3 className="font-bold text-ink">프로필 사진</h3>
            <p className="text-caption text-ink-faint mt-1 font-medium">
              나를 나타내는 멋진 사진을 올려보세요.
            </p>
          </div>
        </section>

        {/* 텍스트 입력 섹션 */}
        <div className="space-y-6">
          <FormGroup>
            <FormLabel>이름</FormLabel>
            <Input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="이름 입력"
            />
          </FormGroup>

          <FormGroup>
            <FormLabel>닉네임</FormLabel>
            <Input
              type="text"
              value={nickname}
              onChange={(e) => {
                setNickname(e.target.value);
                if (nicknameError) setNicknameError(null);
              }}
              placeholder="닉네임 입력"
              error={nicknameError ?? undefined}
            />
          </FormGroup>

          <FormGroup>
            <FormLabel>한줄 소개</FormLabel>
            <Textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={4}
              placeholder="나를 소개해주세요."
              fullWidth
              className="resize-none"
            />
          </FormGroup>
        </div>

        {/* 책갈피 — 프로필 책 윗면에 꽂히는 발췌집 하나 */}
        <section id="bookmark" className="scroll-mt-6">
          <h3 className="font-bold text-ink">책갈피</h3>
          <p className="mt-1 text-caption font-medium text-ink-faint">
            프로필 책에 끼워 두는 책갈피입니다. 완독한 책 중 하나를 고르면 누를 때 그 발췌집으로
            펼쳐집니다.
          </p>
          {finishedBooks.length === 0 ? (
            <p className="mt-4 font-serif text-[14px] text-ink-sub">
              아직 완독한 책이 없습니다. 완독을 선언하면 여기서 고를 수 있어요.
            </p>
          ) : (
            <ul className="mt-4 divide-y divide-hairline border-y border-hairline">
              <li>
                <button
                  type="button"
                  onClick={() => {
                    setBookmarkId(null);
                    setBookmarkDirty(true);
                  }}
                  aria-pressed={bookmarkId === null}
                  className={`flex w-full items-center gap-3 px-1 py-3 text-left text-[13.5px] transition-colors ${
                    bookmarkId === null ? 'text-accent' : 'text-ink-faint hover:text-ink-sub'
                  }`}
                >
                  <span aria-hidden className="w-3 shrink-0 text-center">
                    {bookmarkId === null ? '●' : '○'}
                  </span>
                  책갈피를 꽂지 않습니다
                </button>
              </li>
              {finishedBooks.map((b) => {
                const selected = bookmarkId === b.id;
                return (
                  <li key={b.id}>
                    <button
                      type="button"
                      onClick={() => {
                        setBookmarkId(b.id);
                        setBookmarkDirty(true);
                      }}
                      aria-pressed={selected}
                      className="flex w-full items-center gap-3 px-1 py-3 text-left transition-colors"
                    >
                      <span
                        aria-hidden
                        className={`w-3 shrink-0 text-center text-[13px] ${
                          selected ? 'text-accent' : 'text-ink-faint'
                        }`}
                      >
                        {selected ? '●' : '○'}
                      </span>
                      <span
                        className={`break-keep font-serif text-[14.5px] ${
                          selected ? 'text-ink' : 'text-ink-sub'
                        }`}
                      >
                        {b.title}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {/* 뒷표지 문장 — 프로필 책을 뒤집으면 보이는 인용 하나 */}
        <section id="featured-quote" className="scroll-mt-6">
          <h3 className="font-bold text-ink">뒷표지 문장</h3>
          <p className="mt-1 text-caption font-medium text-ink-faint">
            프로필 책을 뒤집으면 보이는 문장입니다. 내가 남긴 인용 중에서 하나를 고릅니다.
          </p>
          {quotes.length === 0 ? (
            <p className="mt-4 font-serif text-[14px] text-ink-sub">
              아직 인용을 남긴 기록이 없습니다. 문장을 남기면 여기서 고를 수 있어요.
            </p>
          ) : (
            <ul className="mt-4 divide-y divide-hairline border-y border-hairline">
              <li>
                <button
                  type="button"
                  onClick={() => {
                    setFeaturedEntryId(null);
                    setFeaturedDirty(true);
                  }}
                  aria-pressed={featuredEntryId === null}
                  className={`flex w-full items-center gap-3 px-1 py-3 text-left text-[13.5px] transition-colors ${
                    featuredEntryId === null ? 'text-accent' : 'text-ink-faint hover:text-ink-sub'
                  }`}
                >
                  <span aria-hidden className="w-3 shrink-0 text-center">
                    {featuredEntryId === null ? '●' : '○'}
                  </span>
                  뒷표지를 비워 둡니다
                </button>
              </li>
              {quotes.map((q) => {
                const selected = featuredEntryId === q.id;
                return (
                  <li key={q.id}>
                    <button
                      type="button"
                      onClick={() => {
                        setFeaturedEntryId(q.id);
                        setFeaturedDirty(true);
                      }}
                      aria-pressed={selected}
                      className="flex w-full items-start gap-3 px-1 py-3 text-left transition-colors"
                    >
                      <span
                        aria-hidden
                        className={`w-3 shrink-0 pt-0.5 text-center text-[13px] ${
                          selected ? 'text-accent' : 'text-ink-faint'
                        }`}
                      >
                        {selected ? '●' : '○'}
                      </span>
                      <span className="min-w-0">
                        <span
                          className={`line-clamp-2 break-keep font-serif text-[14.5px] leading-relaxed ${
                            selected ? 'text-ink' : 'text-ink-sub'
                          }`}
                        >
                          {q.quote}
                        </span>
                        {q.bookTitle && (
                          <span className="mt-1 block text-[12px] text-ink-faint">
                            『{q.bookTitle}』
                          </span>
                        )}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <div className="flex flex-col space-y-4 pt-2">
          <Button onClick={handleUpdateProfile} disabled={updating || uploading} fullWidth>
            {updating ? '저장 중...' : '변경사항 저장하기'}
          </Button>

          {/* 비밀번호 변경 섹션 분리 (텍스트 링크로 표시) */}
          <div className="text-center">
            <button
              onClick={() => router.push('/protected/profile/update-password')}
              className="text-sm font-semibold text-ink-sub hover:text-ink transition-colors underline underline-offset-4"
            >
              비밀번호 변경
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
