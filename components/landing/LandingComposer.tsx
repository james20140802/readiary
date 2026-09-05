'use client';

import { useEffect, useRef, useState } from 'react';
import { useInView, useReducedMotion } from 'framer-motion';
import { LibraryBig, Lock } from 'lucide-react';
import Card from '@/components/ui/Card';
import Chip from '@/components/ui/Chip';
import Button from '@/components/ui/Button';
import Seal from '@/components/ui/Seal';
import SlideHeading from './SlideHeading';
import { SlideBody } from './Slide';
import { COMPOSER_DEMO } from './demo';

const TYPE_MS = 62;
/** 마침표 뒤에는 잠깐 숨을 고른다 */
const PAUSE_MS = 480;

/**
 * ② 문장 — 홈 맨 위의 기록 입력창 그대로. 화면에 들어오면 문장이 저절로 옮겨 적히고,
 * 남기기를 누르면 실제와 같은 두 번째 단계(덧붙이기)로 넘어간다. 저장은 하지 않는다.
 */
export default function LandingComposer() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.5 });
  const reduced = useReducedMotion();
  const full = COMPOSER_DEMO.quote;

  const [typed, setTyped] = useState(0);
  const [saved, setSaved] = useState(false);
  const [mode, setMode] = useState<'quote' | 'note'>('quote');
  const [isPrivate, setIsPrivate] = useState(false);
  const done = typed >= full.length;

  useEffect(() => {
    if (!inView || saved || typed >= full.length) return;
    const delay = reduced ? 0 : full[typed - 1] === '.' ? PAUSE_MS : TYPE_MS;
    const id = window.setTimeout(
      () => setTyped((n) => (reduced ? full.length : Math.min(full.length, n + 1))),
      delay
    );
    return () => window.clearTimeout(id);
  }, [inView, typed, saved, reduced, full]);

  const reset = () => {
    setSaved(false);
    setTyped(0);
    setIsPrivate(false);
    setMode('quote');
  };

  return (
    <div ref={ref}>
      <SlideHeading
        eyebrow="문장"
        title="옮겨 적는 것으로 충분해요"
        body="길게 쓰지 않아도 됩니다. 오늘 마음에 남은 문장 하나가 기록의 시작이에요. 생각이 이어지면 그때 덧붙이면 됩니다."
      />

      <SlideBody className="mt-8">
        {saved ? (
          <Card hoverable={false}>
            <Seal>오늘의 기록</Seal>
            <p className="mt-2 whitespace-pre-wrap font-serif text-quote text-ink">{full}</p>
            <p className="mt-1 text-caption text-ink-sub">{COMPOSER_DEMO.bookTitle}</p>
            <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-3 border-t border-hairline pt-3.5">
              <Chip>{mode === 'quote' ? '생각' : '문장'} 덧붙이기</Chip>
              <Chip>페이지 남기기</Chip>
              <Chip className="ml-auto" onClick={reset}>
                닫기
              </Chip>
            </div>
          </Card>
        ) : (
          <Card hoverable={false}>
            <div
              aria-live="polite"
              className="min-h-[5.4rem] whitespace-pre-wrap font-serif text-[17px] leading-relaxed text-ink"
            >
              {typed === 0 ? (
                <span className="text-ink-faint">오늘 마음에 남은 문장을 남겨보세요</span>
              ) : (
                full.slice(0, typed)
              )}
              {inView && !done && (
                <span
                  aria-hidden
                  className="ml-px inline-block h-[1.05em] w-px translate-y-[3px] animate-pulse bg-ink"
                />
              )}
            </div>

            <div className="mt-3.5 overflow-x-clip border-t border-hairline pt-3.5">
              <div className="-ml-[17px] flex flex-wrap items-center gap-y-2.5">
                <div className="ml-[17px] flex flex-wrap items-center gap-2">
                  <Chip selected dot>
                    <span className="max-w-[8rem] truncate">{COMPOSER_DEMO.bookTitle}</span>
                  </Chip>
                  <Chip className="hidden sm:inline-flex">
                    <span className="max-w-[8rem] truncate">{COMPOSER_DEMO.otherBookTitle}</span>
                  </Chip>
                  <Chip aria-label="내 책 전체 보기">
                    <LibraryBig size={12} strokeWidth={1.75} aria-hidden />내 책
                  </Chip>
                </div>
                <div className="relative ml-[17px] flex flex-1 items-center gap-2 before:absolute before:-left-[9px] before:top-1/2 before:h-4 before:w-px before:-translate-y-1/2 before:bg-hairline">
                  <Chip selected={mode === 'quote'} onClick={() => setMode('quote')}>
                    문장
                  </Chip>
                  <Chip selected={mode === 'note'} onClick={() => setMode('note')}>
                    생각
                  </Chip>
                  <span aria-hidden className="h-4 w-px shrink-0 bg-hairline" />
                  <Chip
                    selected={isPrivate}
                    aria-pressed={isPrivate}
                    onClick={() => setIsPrivate((v) => !v)}
                  >
                    <Lock size={12} strokeWidth={1.75} aria-hidden />
                    비공개
                  </Chip>
                  <Button
                    size="sm"
                    className="ml-auto"
                    onClick={() => setSaved(true)}
                    disabled={!done}
                  >
                    남기기
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        )}
        <p className="mt-3 text-caption text-ink-faint">
          홈 맨 위에 놓이는 실제 입력창이에요. 남기기를 눌러 보세요.
        </p>
      </SlideBody>
    </div>
  );
}
