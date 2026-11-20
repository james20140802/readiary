'use client';

import { useRef, useState } from 'react';
import clsx from 'clsx';
import { Camera } from 'lucide-react';
import { toast } from 'sonner';
import Button from '@/components/ui/Button';
import Sheet from '@/components/ui/Sheet';
import { SessionExpiredError, apiFetch } from '@/lib/api/fetch';
import { photoQuoteVisible } from '@/lib/photo-quote/config';
import PhotoConsentSheet from './PhotoConsentSheet';
import PhotoPicker from './PhotoPicker';

interface PhotoQuoteButtonProps {
  /** 사진에서 고른 글. 문장 칸에 어떻게 넣을지는 받는 쪽이 정한다(appendQuote) */
  onText(text: string): void;
  disabled?: boolean;
  className?: string;
}

type Step = 'closed' | 'checking' | 'consent' | 'source' | 'picking';

const ACCEPT = 'image/*,.heic,.heif';

/**
 * 이 탭에서 동의를 확인했는지. 확인한 뒤로는 버튼을 누를 때마다 서버에 다시 묻지 않는다.
 * 다른 기기에서 철회했다면 서버가 `consent_required`로 답하므로 그때 지우고 다시 묻는다.
 */
let consentKnown = false;

export function forgetPhotoTextConsent() {
  consentKnown = false;
}

function finePointer(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(pointer: fine)').matches;
}

/**
 * 기록 폼의 "사진으로 옮기기" — 책 페이지를 찍거나 골라, 사진 위에서 고른 문장을 돌려준다.
 * 처음이면 동의를 받고, 사진은 OS 카메라·앨범(파일 입력)으로 받는다. iOS 설치형 PWA에서
 * 실시간 카메라(getUserMedia)가 멈추는 문제가 있어 쓰지 않는다.
 * 기능이 꺼져 있으면 아무것도 그리지 않는다.
 */
export default function PhotoQuoteButton({ onText, disabled, className }: PhotoQuoteButtonProps) {
  const [step, setStep] = useState<Step>('closed');
  const [fine, setFine] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [photoKey, setPhotoKey] = useState(0);
  const [saving, setSaving] = useState(false);
  const [consentError, setConsentError] = useState<string | null>(null);
  const directInput = useRef<HTMLInputElement>(null);
  const cameraInput = useRef<HTMLInputElement>(null);
  const albumInput = useRef<HTMLInputElement>(null);

  if (!photoQuoteVisible()) return null;

  const close = () => {
    setStep('closed');
    setFile(null);
    setConsentError(null);
  };

  const onFile = (next: File | undefined) => {
    if (!next) return;
    setFile(next);
    setPhotoKey((k) => k + 1);
    setStep('picking');
  };

  const fileInput = (ref: React.Ref<HTMLInputElement>, capture?: 'environment') => (
    <input
      ref={ref}
      type="file"
      accept={ACCEPT}
      capture={capture}
      hidden
      tabIndex={-1}
      aria-hidden
      onChange={(event) => {
        onFile(event.target.files?.[0]);
        // 같은 사진을 다시 고를 수 있도록 비운다
        event.target.value = '';
      }}
    />
  );

  const start = async () => {
    const isFine = finePointer();
    setFine(isFine);
    if (consentKnown) {
      // 정밀 포인터 기기에서는 선택지 없이 바로 파일 고르기를 연다 — 누른 그 순간이어야 브라우저가 연다
      if (isFine) directInput.current?.click();
      else setStep('source');
      return;
    }
    setStep('checking');
    try {
      const res = await apiFetch('/api/photo-text/consent');
      const data = (await res.json().catch(() => null)) as { consented?: unknown } | null;
      if (!res.ok || typeof data?.consented !== 'boolean') throw new Error('consent check failed');
      consentKnown = data.consented;
      setStep(data.consented ? 'source' : 'consent');
    } catch (error) {
      setStep('closed');
      if (!(error instanceof SessionExpiredError)) toast.error('잠시 뒤 다시 시도해 주세요.');
    }
  };

  const agree = async () => {
    setSaving(true);
    setConsentError(null);
    try {
      const res = await apiFetch('/api/photo-text/consent', { method: 'POST' });
      if (!res.ok) throw new Error('consent save failed');
      consentKnown = true;
      setStep('source');
    } catch (error) {
      if (!(error instanceof SessionExpiredError))
        setConsentError('동의를 남기지 못했어요. 잠시 뒤 다시 시도해 주세요.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <button
        type="button"
        aria-label="사진으로 옮기기"
        aria-haspopup="dialog"
        disabled={disabled || step === 'checking'}
        onClick={() => void start()}
        className={clsx(
          'inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-ink-sub hover:text-ink',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:opacity-60',
          className
        )}
      >
        <Camera size={20} strokeWidth={1.75} aria-hidden />
      </button>
      {fileInput(directInput)}

      <PhotoConsentSheet
        open={step === 'consent'}
        saving={saving}
        error={consentError}
        onAgree={() => void agree()}
        onClose={close}
      />

      <Sheet open={step === 'source'} onClose={close} ariaLabel="사진으로 옮기기">
        <h2 className="font-sans text-[18px] font-bold text-ink">사진으로 옮기기</h2>
        <p className="mt-2 font-sans text-caption text-ink-sub">
          책 페이지를 찍으면 사진 위에서 남기고 싶은 문장만 고를 수 있어요.
        </p>
        <div className="mt-4 flex flex-col gap-2">
          {fine ? (
            <>
              <Button onClick={() => albumInput.current?.click()}>사진 고르기</Button>
              {fileInput(albumInput)}
            </>
          ) : (
            <>
              <Button onClick={() => cameraInput.current?.click()}>사진 찍기</Button>
              <Button variant="secondary" onClick={() => albumInput.current?.click()}>
                앨범에서 고르기
              </Button>
              {fileInput(cameraInput, 'environment')}
              {fileInput(albumInput)}
            </>
          )}
          <Button variant="ghost" onClick={close}>
            취소
          </Button>
        </div>
      </Sheet>

      {step === 'picking' && file && (
        <PhotoPicker
          key={photoKey}
          file={file}
          fine={fine}
          accept={ACCEPT}
          onRetake={() => {
            setFile(null);
            setStep('source');
          }}
          onFile={onFile}
          onUse={(text) => {
            close();
            onText(text);
          }}
          onClose={close}
          onConsentRequired={() => {
            consentKnown = false;
            setFile(null);
            setStep('consent');
          }}
        />
      )}
    </>
  );
}
