'use client';

import { useState, type CSSProperties, type ReactNode } from 'react';
import { Repeat } from 'lucide-react';
import Seal from '@/components/ui/Seal';
import { SpineTitle } from '@/components/books/BookSpineShelf';
import { BOOK_H, BOOK_W, spineThickness } from '@/lib/profile/bookGeometry';
import SlideHeading from './SlideHeading';
import { SlideBody } from './Slide';
import { PROFILE_DEMO } from './demo';

const W = BOOK_W;
const H = BOOK_H;
/** 띠지 — 표지 아래쪽을 감싸는 별지 (프로필 책과 같은 치수) */
const OBI_H = 100;
const OBI_BOTTOM = 18;
/** 좁은 화면에서는 책을 줄여 한 장(100svh)에 들어가게 한다 */
const SCALE_SM = 0.7;

const FACE = 'absolute inset-0 [backface-visibility:hidden]';
const TURN =
  'transition-transform duration-700 ease-[cubic-bezier(0.4,0,0.2,1)] motion-reduce:duration-0';
/** 종이 단면 — 낱장이 겹친 줄무늬 */
const pageEdge = (dir: 'to right' | 'to bottom'): CSSProperties => ({
  backgroundImage: `repeating-linear-gradient(${dir}, rgb(var(--card)) 0 1px, rgb(var(--hairline)) 1px 2px)`,
});

/**
 * ⑦ 프로필 — 프로필 화면의 3D 책 한 권을 덮인 채로. 완독 권수만큼 두꺼운 상자에
 * 앞표지(사진·이름·띠지), 책등, 앞마구리, 뒷표지(골라 둔 문장)가 있고, 누르거나 뒤집기로 돈다.
 * 실제 책은 펼쳐져 판권·발췌집·달별 기록이 넘어가지만, 여기서는 표지만 보여 준다.
 */
export default function LandingProfileBook() {
  const p = PROFILE_DEMO;
  const T = spineThickness(p.finishedBooks);
  const [flipAngle, setFlipAngle] = useState(0);
  const isFlipped = (Math.abs(flipAngle) / 180) % 2 === 1;
  const flip = () => setFlipAngle((angle) => angle + 180);

  const obiBand = (children: ReactNode) => (
    <div
      className="absolute inset-x-0 flex flex-col items-center justify-center gap-2 border-y border-hairline-strong bg-card-raised px-6 text-center shadow-[0_-1px_0_rgb(var(--card)),0_1px_0_rgb(var(--card))]"
      style={{ bottom: OBI_BOTTOM, height: OBI_H }}
    >
      {children}
    </div>
  );

  return (
    <div className="md:grid md:grid-cols-[1fr_auto] md:items-center md:gap-12">
      <SlideHeading
        eyebrow="프로필"
        title="당신은 한 권의 책이 됩니다"
        body="프로필은 완독한 권수만큼 두꺼워지는 책 한 권이에요. 표지엔 사진과 띠지의 한 줄이, 뒷표지엔 골라 둔 문장이 실립니다. 펼치면 판권과 달마다의 기록이 차례로 넘어가요."
      />

      <SlideBody className="mt-6 md:mt-0">
        {/* 자리 상자 — 줄인 책이 차지하는 만큼만 흐름에서 자리를 잡는다 */}
        <div
          className="mx-auto h-[301px] w-[210px] sm:h-[430px] sm:w-[300px]"
          style={{ ['--book-scale' as string]: SCALE_SM }}
        >
          <div
            className="origin-top-left scale-[var(--book-scale)] sm:scale-100 [perspective:1800px]"
            style={{ width: W, height: H }}
          >
            <section
              aria-label={`${p.name}의 프로필 책`}
              onClick={(e) => {
                if ((e.target as HTMLElement).closest('button, a')) return;
                flip();
              }}
              className={`relative h-full w-full cursor-pointer [transform-style:preserve-3d] ${TURN}`}
              style={{ transform: `rotateY(${flipAngle}deg)` }}
            >
              {/* ── 앞표지 ── */}
              <div
                inert={isFlipped}
                className={`${FACE} overflow-hidden rounded-l-[3px] rounded-r-[8px] border border-hairline-strong bg-card p-[5px]`}
                style={{ transform: `translateZ(${T / 2}px)` }}
              >
                <div className="relative h-full w-full overflow-hidden rounded-l-[2px] rounded-r-[5px] border border-hairline">
                  {/* 북라이트 — 왼쪽 위에서 비스듬히. 램프는 그리지 않는다 */}
                  <div
                    aria-hidden
                    className="pointer-events-none absolute left-[18%] top-[-6rem] h-80 w-[36rem] max-w-[140%] -translate-x-1/2 bg-[radial-gradient(ellipse_at_center,rgba(255,196,110,0.16),transparent_66%)]"
                  />
                  {/* 경첩 홈 */}
                  <div
                    aria-hidden
                    className="pointer-events-none absolute inset-y-0 left-2 w-px bg-hairline"
                  />
                  <div
                    className="relative flex flex-col items-center justify-center gap-5 px-7 text-center"
                    style={{ height: H - OBI_H - OBI_BOTTOM - 10 }}
                  >
                    {/* 표지에 붙인 사진 — 인화지 여백에 살짝 비스듬히 */}
                    <div
                      className="w-[112px] shrink-0 border border-hairline bg-card p-[5px]"
                      style={{
                        transform: 'rotate(-1.8deg)',
                        boxShadow:
                          '0 1px 1px rgb(var(--ink) / 0.12), 0 5px 12px rgb(var(--ink) / 0.10)',
                      }}
                    >
                      <div className="flex aspect-square select-none items-center justify-center bg-card-raised font-serif text-4xl text-ink-faint">
                        {p.initial}
                      </div>
                    </div>
                    <div className="min-w-0 max-w-full">
                      <Seal>讀者</Seal>
                      <p className="mt-1.5 text-balance break-keep font-serif text-[27px] font-bold leading-tight text-ink">
                        {p.name}
                      </p>
                      <p className="mt-2 font-sans text-[12.5px] tabular-nums text-ink-faint">
                        @{p.handle}
                      </p>
                    </div>
                  </div>
                </div>
                {obiBand(
                  <>
                    <p className="line-clamp-3 text-balance break-keep font-serif text-[14px] leading-relaxed text-ink">
                      {p.bio}
                    </p>
                    <Seal className="opacity-70">Readiary</Seal>
                  </>
                )}
              </div>

              {/* ── 뒷표지 — 골라 둔 문장 ── */}
              <div
                inert={!isFlipped}
                className={`${FACE} overflow-hidden rounded-l-[8px] rounded-r-[3px] border border-hairline-strong bg-card p-[5px]`}
                style={{ transform: `rotateY(180deg) translateZ(${T / 2}px)` }}
              >
                <div className="relative h-full w-full overflow-hidden rounded-l-[5px] rounded-r-[2px] border border-hairline">
                  <div
                    aria-hidden
                    className="pointer-events-none absolute inset-y-0 right-2 w-px bg-hairline"
                  />
                  <div
                    className="flex flex-col items-center justify-center px-8 text-center"
                    style={{ height: H - OBI_H - OBI_BOTTOM - 10 }}
                  >
                    <blockquote className="min-w-0 max-w-full">
                      <p className="text-balance break-keep font-serif text-[16.5px] leading-[1.75] text-ink">
                        {p.featuredQuote.quote}
                      </p>
                      <footer className="mt-4 text-[12.5px] text-ink-sub">
                        『{p.featuredQuote.bookTitle}』, {p.featuredQuote.author}
                      </footer>
                    </blockquote>
                  </div>
                </div>
                {obiBand(
                  <>
                    <span className="font-sans text-[12px] tabular-nums text-ink-sub">
                      @{p.handle}
                    </span>
                    <Seal className="opacity-70">Readiary</Seal>
                  </>
                )}
              </div>

              {/* ── 책등 ── */}
              <div
                aria-hidden
                className="absolute left-0 top-0 overflow-hidden border border-hairline-strong bg-card [backface-visibility:hidden]"
                style={{
                  width: T,
                  height: H,
                  transform: `translateX(${-T / 2}px) rotateY(-90deg)`,
                }}
              >
                <div
                  className="absolute inset-x-0 top-6 flex justify-center font-serif text-[11px] tracking-[0.1em] text-ink"
                  style={{ writingMode: 'vertical-rl', height: H - OBI_H - OBI_BOTTOM - 40 }}
                >
                  <SpineTitle title={p.name} />
                </div>
                <div
                  className="absolute inset-x-0 border-y border-hairline-strong bg-card-raised"
                  style={{ bottom: OBI_BOTTOM, height: OBI_H }}
                />
              </div>

              {/* ── 앞마구리 — 종이 단면 ── */}
              <div
                aria-hidden
                className="absolute right-0 [backface-visibility:hidden]"
                style={{
                  width: T,
                  height: H - 4,
                  top: 2,
                  transform: `translateX(${T / 2}px) rotateY(90deg)`,
                  ...pageEdge('to right'),
                }}
              />
              {/* ── 윗면·아랫면 ── */}
              <div
                aria-hidden
                className="absolute left-0 top-0 [backface-visibility:hidden]"
                style={{
                  width: W - 3,
                  height: T,
                  transform: `translateY(${-T / 2}px) rotateX(90deg)`,
                  ...pageEdge('to bottom'),
                }}
              />
              <div
                aria-hidden
                className="absolute bottom-0 left-0 [backface-visibility:hidden]"
                style={{
                  width: W - 3,
                  height: T,
                  transform: `translateY(${T / 2}px) rotateX(-90deg)`,
                  ...pageEdge('to bottom'),
                }}
              />
            </section>
          </div>
        </div>

        <div className="mt-3 flex items-center justify-center gap-4 text-[15px] text-ink-faint">
          <button
            type="button"
            onClick={flip}
            aria-label={isFlipped ? '앞표지 보기' : '뒷표지 보기'}
            className="flex items-center gap-1.5 px-1 py-1.5 transition-colors hover:text-accent"
          >
            <Repeat size={16} /> 뒤집기
          </button>
          <span className="text-caption">완독 {p.finishedBooks}권만큼 두꺼워진 책</span>
        </div>
      </SlideBody>
    </div>
  );
}
