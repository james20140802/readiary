'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Dialog, DialogPanel } from '@headlessui/react';
import { Maximize, ZoomIn, ZoomOut } from 'lucide-react';
import Button from '@/components/ui/Button';
import InertBackground from '@/components/ui/InertBackground';
import { SessionExpiredError, apiFetch } from '@/lib/api/fetch';
import { isImageFile, preparePhoto, type PreparedPhoto } from '@/lib/photo-quote/image';
import { allText, rangeText } from '@/lib/photo-quote/select';
import type { PhotoWord } from '@/lib/photo-quote/types';
import PickStage, { type PickStageHandle } from './PickStage';

type Phase =
  | 'preparing' // 사진을 여는 중
  | 'converting' // HEIC을 기기 안에서 바꾸는 중
  | 'reading' // 서버가 글자를 읽는 중
  | 'ready'
  | 'empty' // 글자 없음
  | 'failed' // 네트워크·서버 실패 — 같은 사진으로 다시 시도할 수 있다
  | 'limit' // 하루 한도
  | 'unopenable'; // 열 수 없는 사진

interface PhotoPickerProps {
  file: File;
  /** 마우스처럼 정밀한 포인터가 있는 기기인지 — 확대·축소 버튼과 안내 문구가 달라진다 */
  fine: boolean;
  /** 파일 입력이 받는 형식 */
  accept: string;
  /** 휴대폰의 "다시 찍기" — 찍기·앨범 선택으로 돌아간다. 정밀 포인터에서는 이 화면이 직접 파일 고르기를 연다 */
  onRetake(): void;
  onFile(file: File): void;
  onUse(text: string): void;
  onClose(): void;
  /** 다른 기기에서 동의를 철회했을 때 */
  onConsentRequired(): void;
}

/** 서버가 15초 안에 Vision의 답을 기다리므로, 그보다 넉넉히 기다린 뒤 포기한다 */
const READ_TIMEOUT_MS = 30_000;

const STATUS: Record<Phase, string> = {
  preparing: '사진을 여는 중…',
  converting: '사진을 준비하는 중…',
  reading: '글자를 읽는 중…',
  ready: '',
  empty: '이 사진에서 글자를 찾지 못했어요. 더 밝은 곳에서 다시 찍어 보세요.',
  failed: '글자를 읽지 못했어요.',
  limit: '오늘은 사진을 더 읽을 수 없어요. 내일 다시 쓸 수 있어요.',
  unopenable: '이 사진을 열지 못했어요. 다른 사진으로 다시 골라 주세요.',
};

function isWords(value: unknown): value is { words: PhotoWord[] } {
  return (
    typeof value === 'object' &&
    value !== null &&
    Array.isArray((value as { words?: unknown }).words)
  );
}

/**
 * 고르는 화면 — 전체 화면 대화상자(lg 이상은 화면을 거의 채우는 가운데 창). 수정 시트 위에서도 열리므로
 * Sheet(z-100)보다 위에 쌓인다. 사진은 이 화면이 열려 있는 동안 메모리에만 있고, 닫으면 놓는다.
 * 부모가 `key`로 사진마다 새로 만들어 준다.
 */
export default function PhotoPicker({
  file,
  fine,
  accept,
  onRetake,
  onFile,
  onUse,
  onClose,
  onConsentRequired,
}: PhotoPickerProps) {
  const [phase, setPhase] = useState<Phase>('preparing');
  const [photo, setPhoto] = useState<PreparedPhoto | null>(null);
  const [words, setWords] = useState<PhotoWord[]>([]);
  const [range, setRange] = useState<[number, number] | null>(null);
  const stageRef = useRef<PickStageHandle>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const request = useRef<AbortController | null>(null);
  const alive = useRef(true);
  const consentRequired = useRef(onConsentRequired);
  useEffect(() => {
    consentRequired.current = onConsentRequired;
  });

  const read = useCallback(async (blob: Blob) => {
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    const timer = setTimeout(() => controller.abort(), READ_TIMEOUT_MS);
    setPhase('reading');
    try {
      const res = await apiFetch('/api/photo-text', {
        method: 'POST',
        headers: { 'Content-Type': 'image/jpeg' },
        body: blob,
        signal: controller.signal,
      });
      const data: unknown = await res.json().catch(() => null);
      if (!alive.current || request.current !== controller) return;
      if (res.ok && isWords(data)) {
        setWords(data.words);
        setPhase(data.words.length > 0 ? 'ready' : 'empty');
        return;
      }
      const code = (data as { code?: unknown } | null)?.code;
      if (code === 'consent_required') consentRequired.current();
      else setPhase(code === 'daily_limit' ? 'limit' : 'failed');
    } catch (error) {
      // 세션이 끊겼으면 apiFetch가 로그인 화면으로 보내는 중이다
      if (error instanceof SessionExpiredError) return;
      if (!alive.current || request.current !== controller) return;
      setPhase('failed');
    } finally {
      clearTimeout(timer);
    }
  }, []);

  useEffect(() => {
    alive.current = true;
    let url: string | null = null;
    void (async () => {
      let prepared: PreparedPhoto;
      try {
        prepared = await preparePhoto(file, () => {
          if (alive.current) setPhase('converting');
        });
      } catch {
        if (alive.current) setPhase('unopenable');
        return;
      }
      if (!alive.current) {
        URL.revokeObjectURL(prepared.url);
        return;
      }
      url = prepared.url;
      setPhoto(prepared);
      await read(prepared.blob);
    })();
    return () => {
      alive.current = false;
      request.current?.abort();
      if (url) URL.revokeObjectURL(url);
    };
  }, [file, read]);

  const picked = range && phase === 'ready' ? rangeText(words, range[0], range[1]) : '';
  const everything = phase === 'ready' ? allText(words) : '';
  const hint = fine
    ? '첫 낱말에서 끝 낱말까지 끌어 보세요'
    : '첫 낱말을 길게 누른 채 끝까지 끌어 보세요';
  const busy = phase === 'preparing' || phase === 'converting' || phase === 'reading';
  const problem =
    phase === 'empty' || phase === 'failed' || phase === 'limit' || phase === 'unopenable';

  // 정밀 포인터에서는 화면을 둔 채 바로 다른 사진을 고른다. 입력은 이 대화상자 안에 둔다 — 바깥은 inert다
  const retake = () => {
    if (fine) fileInput.current?.click();
    else onRetake();
  };

  const onDrop = (event: React.DragEvent) => {
    event.preventDefault();
    const dropped = [...event.dataTransfer.files].find(isImageFile);
    if (dropped) onFile(dropped);
  };

  const zoomButton =
    'inline-flex h-10 w-10 items-center justify-center rounded-full border border-hairline-strong bg-sheet text-ink hover:bg-card-raised focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent';
  const barButton =
    'min-h-11 px-2 font-sans text-[16px] font-semibold text-accent focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent';

  return (
    <Dialog open onClose={onClose} aria-label="사진으로 옮기기" className="relative z-[110]">
      <InertBackground />
      <div aria-hidden className="fixed inset-0 bg-scrim/[.5]" />
      <DialogPanel
        onDragOver={(event) => event.preventDefault()}
        onDrop={onDrop}
        className="fixed inset-0 flex flex-col overflow-hidden bg-sheet text-ink lg:inset-6 lg:rounded-[16px] lg:shadow-[0_30px_80px_-20px_rgb(30_20_10/.45)]"
      >
        <div className="flex shrink-0 items-center justify-between px-3 pt-[var(--app-safe-top)]">
          <button type="button" onClick={onClose} className={barButton}>
            닫기
          </button>
          {phase !== 'limit' && (
            <button type="button" onClick={retake} className={barButton}>
              {fine ? '다른 사진 고르기' : '다시 찍기'}
            </button>
          )}
        </div>

        <input
          ref={fileInput}
          type="file"
          accept={accept}
          hidden
          tabIndex={-1}
          aria-hidden
          onChange={(event) => {
            const next = event.target.files?.[0];
            event.target.value = '';
            if (next) onFile(next);
          }}
        />

        <div className="relative min-h-0 flex-1 bg-scrim">
          {photo && (
            <PickStage
              ref={stageRef}
              src={photo.url}
              image={{ w: photo.width, h: photo.height }}
              words={phase === 'ready' ? words : []}
              range={range}
              onRange={setRange}
              className="h-full w-full"
            />
          )}
          {photo && fine && (
            <div className="absolute bottom-3 right-3 flex flex-col gap-2">
              <button
                type="button"
                aria-label="확대"
                onClick={() => stageRef.current?.zoomBy(1.5)}
                className={zoomButton}
              >
                <ZoomIn size={20} strokeWidth={1.75} aria-hidden />
              </button>
              <button
                type="button"
                aria-label="축소"
                onClick={() => stageRef.current?.zoomBy(1 / 1.5)}
                className={zoomButton}
              >
                <ZoomOut size={20} strokeWidth={1.75} aria-hidden />
              </button>
              <button
                type="button"
                aria-label="화면에 맞추기"
                onClick={() => stageRef.current?.fit()}
                className={zoomButton}
              >
                <Maximize size={20} strokeWidth={1.75} aria-hidden />
              </button>
            </div>
          )}
        </div>

        <div className="shrink-0 border-t border-hairline px-4 pb-[calc(14px+var(--app-safe-bottom))] pt-3">
          <p
            role={problem ? 'alert' : 'status'}
            className="min-h-6 font-sans text-caption text-ink-sub"
          >
            {phase === 'ready' ? (picked ? '' : hint) : STATUS[phase]}
          </p>
          {picked && (
            <p className="line-clamp-3 whitespace-pre-wrap font-serif text-note text-ink">
              {picked}
            </p>
          )}
          <div className="mt-3 flex items-center justify-end gap-2">
            {phase === 'failed' && photo && (
              <Button variant="secondary" size="sm" onClick={() => void read(photo.blob)}>
                다시 시도
              </Button>
            )}
            {phase === 'limit' || phase === 'unopenable' ? (
              <Button size="sm" onClick={phase === 'limit' ? onClose : retake}>
                {phase === 'limit' ? '닫기' : fine ? '다른 사진 고르기' : '다시 찍기'}
              </Button>
            ) : (
              <>
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={busy || everything === ''}
                  onClick={() => onUse(everything)}
                >
                  전부 가져오기
                </Button>
                <Button size="sm" disabled={picked === ''} onClick={() => onUse(picked)}>
                  이 문장 쓰기
                </Button>
              </>
            )}
          </div>
        </div>
      </DialogPanel>
    </Dialog>
  );
}
