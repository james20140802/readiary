'use client';

import { useId, useRef } from 'react';
import Image from 'next/image';
import { toast } from 'sonner';
import { Copy, Loader2 } from 'lucide-react';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import FormGroup from '@/components/ui/FormGroup';
import FormLabel from '@/components/ui/FormLabel';
import { Meta, SubLabel } from './SettingsParts';

export interface ProfileFieldsViewProps {
  /** 지금 보이는 사진 주소 — 없으면 머리글자 */
  avatarSrc: string | null;
  displayName: string;
  handle: string;
  name: string;
  nickname: string;
  bio: string;
  nicknameError: string | null;
  uploading: boolean;
  saving: boolean;
  onName: (v: string) => void;
  onNickname: (v: string) => void;
  onBio: (v: string) => void;
  onPickAvatar: (file: File) => void;
  onRemoveAvatar: () => void;
  onSave: () => void;
}

/** 프로필 구역 — 사진, 이름·닉네임·한 줄 소개, 저장(시안 settings.html #profile) */
export function ProfileFieldsView(props: ProfileFieldsViewProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const hintId = useId();
  const busy = props.uploading || props.saving;

  const copyHandle = async () => {
    try {
      await navigator.clipboard.writeText(props.handle);
      toast.success('닉네임#태그를 복사했어요.');
    } catch {
      toast.error('복사하지 못했어요.');
    }
  };

  return (
    <div>
      <div className="mt-5 flex items-center gap-4">
        <div className="relative h-[72px] w-[72px] shrink-0 overflow-hidden rounded-full border border-hairline bg-sheet">
          {props.avatarSrc ? (
            <Image
              src={props.avatarSrc}
              unoptimized
              alt="프로필 사진"
              fill
              className="object-cover"
            />
          ) : (
            <span className="grid h-full w-full place-items-center font-serif text-[28px] font-bold text-ink-faint">
              {props.displayName.at(0) ?? '?'}
            </span>
          )}
          {props.uploading && (
            <span className="absolute inset-0 grid place-items-center bg-scrim/40">
              <Loader2 className="animate-spin text-ink-invert" aria-label="사진을 고르는 중" />
            </span>
          )}
        </div>
        <div className="min-w-0">
          <b className="block truncate font-sans text-[20px] font-bold text-ink">
            {props.displayName}
          </b>
          <button
            type="button"
            onClick={() => void copyHandle()}
            className="inline-flex min-h-10 items-center gap-1.5 font-mono text-[15px] font-medium text-ink-sub"
          >
            {props.handle}
            <Copy size={16} strokeWidth={1.75} aria-hidden />
            <span className="sr-only">복사하기</span>
          </button>
        </div>
      </div>
      <div className="mt-2.5 flex gap-2">
        <Button
          size="sm"
          variant="secondary"
          disabled={busy}
          onClick={() => fileRef.current?.click()}
        >
          사진 바꾸기
        </Button>
        <Button
          size="sm"
          variant="secondary"
          disabled={busy || !props.avatarSrc}
          onClick={props.onRemoveAvatar}
        >
          사진 지우기
        </Button>
        <input
          ref={fileRef}
          type="file"
          className="hidden"
          accept="image/*"
          tabIndex={-1}
          aria-hidden
          onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = '';
            if (file) props.onPickAvatar(file);
          }}
          disabled={busy}
        />
      </div>
      <Meta className="mt-2 text-[13px]">
        사진은 로그인한 회원에게만 보여요. 저장하기 전에는 서버에 올리지 않아요.
      </Meta>

      <FormGroup className="mt-[18px]">
        <FormLabel variant="line" htmlFor="profile-name">
          이름
        </FormLabel>
        <Input
          variant="line"
          id="profile-name"
          type="text"
          autoComplete="name"
          value={props.name}
          onChange={(e) => props.onName(e.target.value)}
        />
      </FormGroup>
      <FormGroup className="mt-[18px]">
        <FormLabel variant="line" htmlFor="profile-nickname">
          닉네임
        </FormLabel>
        <Input
          variant="line"
          id="profile-nickname"
          type="text"
          autoCapitalize="off"
          autoComplete="username"
          aria-describedby={hintId}
          value={props.nickname}
          onChange={(e) => props.onNickname(e.target.value)}
          error={props.nicknameError ?? undefined}
        />
        <p
          id={hintId}
          className="mt-1.5 font-sans text-[13px] font-medium leading-normal text-ink-sub"
        >
          친구는 닉네임#태그로 나를 찾아요. 닉네임을 바꾸면 태그도 새로 정해져요.
        </p>
      </FormGroup>
      <div className="mt-[18px]">
        <Textarea
          label="한 줄 소개 · ‘나’ 화면 표지 아래에 들어가요"
          variant="line"
          id="profile-bio"
          value={props.bio}
          onChange={(e) => props.onBio(e.target.value)}
          rows={2}
          fullWidth
          className="resize-none font-serif"
        />
      </div>
      <Button className="mt-[18px]" onClick={props.onSave} disabled={busy} loading={props.saving}>
        {props.saving ? '저장하는 중…' : '고친 내용 저장'}
      </Button>
    </div>
  );
}

/** 내 책의 표지 구역 — 표지 문장과 책갈피를 고른다. 고른 것은 프로필과 함께 저장된다 */
export function CoverFieldsView({
  quotePicker,
  bookmarkPicker,
  dirty,
  saving,
  onSave,
}: {
  quotePicker: React.ReactNode;
  bookmarkPicker: React.ReactNode;
  dirty: boolean;
  saving: boolean;
  onSave: () => void;
}) {
  return (
    <div>
      <Meta className="mt-1">‘나’ 화면 첫 장과 판권 장에 들어가요.</Meta>
      <SubLabel className="mt-[18px]">표지 문장</SubLabel>
      {quotePicker}
      <SubLabel className="mt-[18px]">책갈피 · 다 읽은 책 중 하나</SubLabel>
      <Meta className="mt-1 text-[13px]">책갈피를 누르면 그 책의 발췌집이 열려요.</Meta>
      {bookmarkPicker}
      {dirty && (
        <div className="mt-4 flex items-center gap-3">
          <Button onClick={onSave} disabled={saving} loading={saving}>
            {saving ? '저장하는 중…' : '고친 내용 저장'}
          </Button>
          <Meta className="text-[13px]">저장해야 표지에 들어가요.</Meta>
        </div>
      )}
    </div>
  );
}
