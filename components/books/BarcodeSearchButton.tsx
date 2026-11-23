'use client';

import { useRef, useState } from 'react';
import { Loader2, ScanBarcode } from 'lucide-react';

const ACCEPT = 'image/*,.heic,.heif';

export type BarcodeOutcome =
  | { kind: 'isbn'; isbn: string }
  | { kind: 'none' }
  | { kind: 'unreadable' }
  | { kind: 'failed' };

/** 버튼 아래에 남길 안내. 성공하면 검색 결과가 대신 말하므로 비운다 */
export function barcodeMessage(outcome: BarcodeOutcome | null): string | null {
  if (!outcome || outcome.kind === 'isbn') return null;
  if (outcome.kind === 'none')
    return '책 바코드를 찾지 못했어요. 바코드가 가운데에 크고 또렷하게 나오도록 다시 찍어 주세요.';
  if (outcome.kind === 'unreadable') return '이 사진을 열지 못했어요. 다른 사진으로 해 주세요.';
  return '바코드를 읽지 못했어요. 잠시 뒤 다시 해 주세요.';
}

/**
 * 검색줄 안의 바코드 아이콘 — 뒤표지 바코드를 찍거나 고르면 기기 안에서 ISBN을 읽어 돌려준다.
 * iOS 설치형 PWA에서 실시간 카메라가 멈추는 문제가 있어 OS 카메라·앨범(파일 입력)으로 받는다.
 * 실패 안내는 `onMessage`로 넘겨 검색줄 아래(SearchBox의 status)에 적게 한다.
 */
export default function BarcodeSearchButton({
  onStart,
  onIsbn,
  onMessage,
  disabled,
}: {
  /** 사진을 받아 읽기 시작할 때. 읽는 사이 사용자가 다른 일을 했는지 가늠하는 기준점으로 쓴다 */
  onStart?(): void;
  onIsbn(isbn: string): void;
  onMessage(message: string | null): void;
  disabled?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [reading, setReading] = useState(false);

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    onStart?.();
    setReading(true);
    onMessage(null);
    let next: BarcodeOutcome;
    try {
      const { readIsbnFromPhoto, BarcodePhotoError } = await import('@/lib/books/barcode');
      try {
        const isbn = await readIsbnFromPhoto(file);
        next = isbn ? { kind: 'isbn', isbn } : { kind: 'none' };
      } catch (error) {
        next = error instanceof BarcodePhotoError ? { kind: 'unreadable' } : { kind: 'failed' };
        if (next.kind === 'failed') console.error(error);
      }
    } catch (error) {
      console.error(error);
      next = { kind: 'failed' };
    }
    setReading(false);
    onMessage(barcodeMessage(next));
    if (next.kind === 'isbn') onIsbn(next.isbn);
  };

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT}
        hidden
        tabIndex={-1}
        aria-hidden
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = ''; // 같은 사진을 다시 골라도 change가 오게
          void handleFile(file);
        }}
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={disabled || reading}
        aria-label={reading ? '바코드 읽는 중' : '바코드로 찾기'}
        title="바코드로 찾기"
        className="grid size-11 shrink-0 place-items-center rounded-full text-ink-sub transition-colors hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-50"
      >
        {reading ? (
          <Loader2
            size={22}
            strokeWidth={1.75}
            className="animate-spin motion-reduce:animate-none"
            aria-hidden
          />
        ) : (
          <ScanBarcode size={22} strokeWidth={1.75} aria-hidden />
        )}
      </button>
    </>
  );
}
