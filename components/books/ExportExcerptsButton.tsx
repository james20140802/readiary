'use client';

import { useActionLock } from '@/hooks/useActionLock';
import { useEffect, useRef, useState, type Ref } from 'react';
import { flushSync } from 'react-dom';
import { toBlob } from 'html-to-image';
import { toast } from 'sonner';
import Seal from '@/components/ui/Seal';
import Button from '@/components/ui/Button';
import Sheet from '@/components/ui/Sheet';
import ExcerptBooklet, { ExcerptBookletProps, MonthlyBooks, koreanCount } from './ExcerptBooklet';
import { LIGHT_PALETTE } from '@/lib/share/palette';
import { formatReadingPeriod } from '@/lib/dates';
import { layoutQuote, QUOTE_TIERS, type QuotePage } from '@/lib/export/excerpt-cards';

type ExportMode = 'long' | 'cards';
type Stage = 'choose' | 'generating' | 'preview';

// iOS Safari의 캔버스 픽셀 상한(약 16.7M px) — 넘으면 캡처가 빈/잘린 이미지가 된다.
// 면적과 별개로 한 변의 길이에도 브라우저별 상한이 있다(낮은 쪽 기준 보수적으로).
// 문장이 많은 발췌집의 '한 장으로' 내보내기는 두 상한 아래로 배율을 낮춰 찍는다.
const SAFE_CANVAS_AREA = 16_000_000;
const SAFE_CANVAS_DIM = 16_000;

function exceedsCanvasLimits(width: number, height: number): boolean {
  return width * height > SAFE_CANVAS_AREA || Math.max(width, height) > SAFE_CANVAS_DIM;
}

function pixelRatioFor(el: HTMLElement): number {
  const { width, height } = el.getBoundingClientRect();
  if (width <= 0 || height <= 0) return 2;
  const maxRatio = Math.min(
    Math.sqrt(SAFE_CANVAS_AREA / (width * height)),
    SAFE_CANVAS_DIM / Math.max(width, height)
  );
  return Math.min(2, Math.max(1, Math.floor(maxRatio * 10) / 10));
}

/**
 * 문장 칸에 글자가 다 들어가는가. 재는 카드와 찍는 카드가 같은 조판을 쓴다.
 */
function quoteFits(card: HTMLElement): boolean {
  const slot = card.querySelector('[data-card-slot]');
  const quote = card.querySelector('blockquote');
  return !slot || !quote || quote.offsetHeight <= slot.clientHeight;
}

const quoteClass = (tier: number) =>
  `whitespace-pre-wrap break-words text-center font-serif text-ink ${QUOTE_TIERS[tier]}`;

type CardPage = QuotePage & { id: string; number: number; source: string };

/** 재는 카드의 글자를 바꿔 가며 문장마다 카드를 나눈다 */
function layoutCards(
  probe: HTMLElement,
  quotes: { id: string; quote: string; source: string }[]
): CardPage[] {
  const quoteEl = probe.querySelector('blockquote')!;
  const sourceEl = probe.querySelector('[data-card-source]')!;
  return quotes.flatMap(({ id, quote, source }, index) => {
    sourceEl.textContent = source;
    const pages = layoutQuote(quote, (text, tier) => {
      quoteEl.className = quoteClass(tier);
      quoteEl.textContent = text;
      return quoteFits(probe);
    });
    return pages.map((page) => ({ ...page, id, number: index + 1, source }));
  });
}

/** 재기 전에 카드가 쓸 글꼴을 받아 둔다 — 대체 글꼴로 재면 나누는 자리가 틀어진다 */
async function loadCardFonts(probe: HTMLElement, text: string) {
  const quoteEl = probe.querySelector('blockquote')!;
  for (let tier = 0; tier < QUOTE_TIERS.length; tier++) {
    quoteEl.className = quoteClass(tier);
    await document.fonts?.load(getComputedStyle(quoteEl).font, text);
  }
}

function QuoteCard({
  page,
  cardRef,
}: {
  page: Pick<CardPage, 'text' | 'tier' | 'part' | 'parts' | 'number' | 'source'>;
  cardRef?: Ref<HTMLDivElement>;
}) {
  return (
    <div ref={cardRef} style={{ width: 540, height: 675, ...LIGHT_PALETTE }} className="bg-paper">
      <div className="flex h-full w-full flex-col px-12 py-10">
        <div className="text-center font-serif text-[13px] font-normal leading-5 tabular-nums text-accent">
          {page.number}
          {page.parts > 1 ? ` · ${page.part}/${page.parts}` : ''}
        </div>
        <div data-card-slot className="my-4 flex min-h-0 flex-1 items-center justify-center">
          <blockquote className={quoteClass(page.tier)}>{page.text}</blockquote>
        </div>
        <div className="text-center">
          <p
            data-card-source
            className="break-words font-serif text-[13px] font-normal leading-5 text-ink-sub"
          >
            {page.source}
          </p>
          <p className="mt-2 whitespace-nowrap font-sans text-seal uppercase text-ink-faint">
            READIARY
          </p>
        </div>
      </div>
    </div>
  );
}

/**
 * 발췌집 이미지 내보내기 — 긴 이미지 한 장 또는 4:5 카드 여러 장.
 *
 * 캡처(수 초)가 끝난 뒤 곧바로 navigator.share를 부르면 Safari가
 * 사용자 제스처가 아니라며 거부한다. 그래서 생성 결과를 미리보기 시트로
 * 보여주고, 공유·저장은 시트 안의 버튼(새 탭 제스처)에서 일어난다.
 */
interface ExportExcerptsButtonProps extends ExcerptBookletProps {
  /** 바깥에서 여닫을 때(상단 바 버튼 등). 있으면 시트를 이 값으로 연다 */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** 기본 여는 버튼을 그리지 않는다 */
  hideTrigger?: boolean;
  /** 고르기 단계에서 내보내기 전에 알릴 말(비공개 문장 포함 등) */
  notice?: string;
}

export default function ExportExcerptsButton({
  open,
  onOpenChange,
  hideTrigger = false,
  notice,
  ...props
}: ExportExcerptsButtonProps) {
  const { bookTitle, author, quotes, entryDates, monthly } = props;
  const exportAction = useActionLock();
  const longRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);
  const probeRef = useRef<HTMLDivElement>(null);
  const [cardPages, setCardPages] = useState<CardPage[] | null>(null);
  const [stage, setStage] = useState<Stage | null>(null);
  // 바깥에서 열면 고르기부터 — 이전 값과 비교해 렌더 중에 맞춘다
  const [prevOpen, setPrevOpen] = useState(open);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open && stage === null) setStage('choose');
  }
  const [mode, setMode] = useState<ExportMode | null>(null);
  // 카드가 수십 장이어도 탭 메모리가 버티도록 base64 data URL 대신
  // Blob(File) + object URL만 쥔다 — 미리보기 디코드는 lazy 로딩에 맡긴다.
  const [files, setFiles] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);

  const readingPeriod = formatReadingPeriod(entryDates);

  // 뒤로가기 등 close() 없이 언마운트되는 경로에서도 미리보기 URL이 revoke되도록
  // 살아 있는 목록을 ref로 함께 들고 다닌다 (revoke는 중복 호출해도 무해).
  const previewUrlsRef = useRef<string[]>([]);
  useEffect(
    () => () => {
      previewUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    },
    []
  );

  const close = () => {
    if (exportAction.isLocked()) return;
    previewUrls.forEach((url) => URL.revokeObjectURL(url));
    previewUrlsRef.current = [];
    setStage(null);
    setMode(null);
    setFiles([]);
    setPreviewUrls([]);
    onOpenChange?.(false);
  };

  useEffect(() => {
    if (stage !== 'generating' || !mode) return;
    let cancelled = false;
    (async () => {
      // 중간에 실패하면 이미 만든 object URL을 catch에서 되짚어 revoke한다
      const nextUrls: string[] = [];
      try {
        await document.fonts?.ready;
        await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
        if (mode === 'cards') {
          const probe = probeRef.current;
          if (!probe) throw new Error('재는 카드 없음');
          await loadCardFonts(probe, quotes.map((q) => q.quote).join(''));
          if (cancelled) return;
          const pages = layoutCards(
            probe,
            quotes.map((q) => ({
              id: q.id,
              quote: q.quote,
              source: `『${q.bookTitle ?? bookTitle}』${author ? ` — ${author}` : ''}`,
            }))
          );
          cardRefs.current.length = pages.length + 2;
          flushSync(() => setCardPages(pages));
          await new Promise((r) => requestAnimationFrame(r));
          // 잰 값과 찍을 카드가 어긋나면 잘린 그림을 내보내지 않고 실패로 알린다
          if (!cardRefs.current.every((card) => !card || quoteFits(card))) {
            throw new Error('카드 넘침');
          }
        }
        const targets = (mode === 'long' ? [longRef.current] : cardRefs.current).filter(
          (el): el is HTMLDivElement => el != null
        );
        if (targets.length === 0) throw new Error('캡처 대상 없음');
        if (mode === 'long') {
          const { width, height } = targets[0].getBoundingClientRect();
          if (exceedsCanvasLimits(width, height)) {
            toast.error('문장이 많아 한 장으로는 내보낼 수 없어요. 카드로 나누어를 이용해 주세요.');
            if (!cancelled) setStage('choose');
            return;
          }
        }
        // Safari는 첫 캡처에서 웹폰트가 빠지는 일이 있어 한 번 버리고 시작한다
        await toBlob(targets[0], { pixelRatio: pixelRatioFor(targets[0]), cacheBust: true });
        const nextFiles: File[] = [];
        for (let i = 0; i < targets.length; i++) {
          // 시트를 닫거나 페이지를 떠나면 남은 카드 캡처를 즉시 중단한다
          if (cancelled) {
            nextUrls.forEach((url) => URL.revokeObjectURL(url));
            return;
          }
          const blob = await toBlob(targets[i], {
            pixelRatio: pixelRatioFor(targets[i]),
            cacheBust: true,
          });
          if (!blob) throw new Error('캡처 실패');
          const name =
            targets.length === 1 ? 'readiary-excerpts.png' : `readiary-excerpt-${i + 1}.png`;
          nextFiles.push(new File([blob], name, { type: 'image/png' }));
          nextUrls.push(URL.createObjectURL(blob));
        }
        if (!cancelled) {
          // setPreviewUrls 커밋 전에 언마운트돼도 cleanup이 이 목록을 보도록 즉시 미러링
          previewUrlsRef.current = nextUrls;
          setFiles(nextFiles);
          setPreviewUrls(nextUrls);
          setStage('preview');
        } else {
          nextUrls.forEach((url) => URL.revokeObjectURL(url));
        }
      } catch (error) {
        nextUrls.forEach((url) => URL.revokeObjectURL(url));
        console.error('발췌집 이미지 생성 실패:', error);
        if (!cancelled) {
          toast.error('이미지 생성에 실패했습니다.');
          setStage('choose');
        }
      }
    })();
    return () => {
      cancelled = true;
    };
    // 조판 중에 부모가 다시 그려져도 처음부터 다시 찍지 않는다
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage, mode]);

  const saveFiles = async () => {
    await Promise.all(
      files.map(
        (file, i) =>
          new Promise<void>((resolve) => {
            // 저장 전용 URL을 따로 만든다 — 스태거 도중 시트를 닫아
            // 미리보기 URL이 revoke돼도 예약된 다운로드가 살아남도록
            const blobUrl = URL.createObjectURL(file);
            setTimeout(() => {
              const anchor = document.createElement('a');
              anchor.href = blobUrl;
              anchor.download = file.name;
              anchor.click();
              setTimeout(() => URL.revokeObjectURL(blobUrl), 10_000);
              resolve();
            }, i * 300);
          })
      )
    );
    toast.success(
      files.length === 1
        ? '발췌집 이미지를 저장했습니다.'
        : `이미지 ${files.length}장을 저장했습니다.`
    );
  };

  // http dev 서버 같은 비보안 컨텍스트에는 navigator.share가 아예 없다
  const canUseShareSheet =
    typeof navigator !== 'undefined' && typeof navigator.share === 'function';

  const handleSave = async () => {
    if (!exportAction.acquire()) return;
    try {
      await saveFiles();
    } finally {
      exportAction.release();
    }
  };

  const handleShare = async () => {
    if (!exportAction.acquire()) return;
    try {
      if (typeof navigator.share === 'function' && navigator.canShare?.({ files })) {
        try {
          await navigator.share({
            files,
            title: monthly ? `달의 발췌집 — ${monthly.label}` : `발췌집 — ${bookTitle}`,
          });
        } catch (error) {
          if ((error as DOMException)?.name !== 'AbortError') {
            console.error('발췌집 공유 실패:', error);
            toast.error('공유에 실패했습니다.');
          }
        }
      } else {
        await saveFiles();
      }
    } finally {
      exportAction.release();
    }
  };

  const TILE =
    'rounded-[10px] p-4 text-left shadow-[inset_0_0_0_1px_rgb(var(--hairline))] transition-shadow hover:shadow-[inset_0_0_0_2px_rgb(var(--ink))] disabled:opacity-50';

  return (
    <>
      {!hideTrigger && (
        <button
          type="button"
          onClick={() => {
            setStage('choose');
            onOpenChange?.(true);
          }}
          className="min-h-11 font-sans text-button-sm text-accent transition-colors hover:underline"
        >
          이미지로 내보내기
        </button>
      )}

      <Sheet open={stage !== null} onClose={close} title="이미지로 내보내기">
        {stage === 'choose' && notice && (
          <p className="mt-1 font-sans text-caption text-ink-sub">{notice}</p>
        )}
        {stage === 'choose' && (
          <div className="mt-3 grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => {
                setMode('long');
                setStage('generating');
              }}
              className={TILE}
            >
              <span className="block font-sans text-[16px] font-semibold text-ink">한 장으로</span>
              <small className="mt-1 block font-sans text-[13px] font-medium leading-[1.5] text-ink-sub">
                표지부터 판권장까지 긴 이미지 하나
              </small>
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('cards');
                setStage('generating');
              }}
              className={TILE}
            >
              <span className="block font-sans text-[16px] font-semibold text-ink">
                카드로 나누어
              </span>
              <small className="mt-1 block font-sans text-[13px] font-medium leading-[1.5] text-ink-sub">
                인스타그램에 맞는 4:5 카드 여러 장 · 긴 문장은 다음 장으로 이어져요
              </small>
            </button>
          </div>
        )}

        {stage === 'generating' && (
          <p role="status" className="py-10 text-center font-sans text-caption text-ink-sub">
            발췌집을 조판하는 중…
          </p>
        )}

        {stage === 'preview' && (
          <>
            <p className="font-sans text-caption text-ink-sub">
              {previewUrls.length === 1
                ? '이미지가 준비됐어요.'
                : `카드 ${previewUrls.length}장이 준비됐어요.`}
            </p>
            <div
              className={
                previewUrls.length === 1
                  ? 'mt-3 max-h-[46dvh] overflow-y-auto rounded-[4px]'
                  : 'mt-3 flex gap-2.5 overflow-x-auto pb-1.5 [scrollbar-width:none]'
              }
            >
              {previewUrls.map((src, i) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={i}
                  src={src}
                  alt={`발췌집 이미지 ${i + 1}`}
                  loading="lazy"
                  decoding="async"
                  className={
                    previewUrls.length === 1
                      ? 'w-full'
                      : 'w-[150px] flex-none rounded-[4px] shadow-[0_10px_24px_-12px_rgb(30_20_10/.45)]'
                  }
                />
              ))}
            </div>
            <div className="mt-[18px] flex gap-2">
              {canUseShareSheet ? (
                <>
                  <Button
                    variant="secondary"
                    className="flex-1"
                    onClick={handleSave}
                    disabled={exportAction.busy}
                  >
                    저장
                  </Button>
                  <Button className="flex-1" onClick={handleShare} disabled={exportAction.busy}>
                    공유하기
                  </Button>
                </>
              ) : (
                <Button className="flex-1" onClick={handleSave} disabled={exportAction.busy}>
                  저장
                </Button>
              )}
            </div>
            <p className="mt-3 font-sans text-caption text-ink-sub">
              {canUseShareSheet
                ? '아이폰에서 저장이 안 되면 이미지를 길게 눌러 ‘사진에 저장’을 고르세요.'
                : '이 환경에서는 공유 창을 열 수 없어요. 아이폰·아이패드에서는 이미지를 길게 눌러 ‘사진에 저장’을 고르세요.'}
            </p>
          </>
        )}
      </Sheet>

      {/* 오프스크린 캡처 대상 — 생성 중에만 조판한다 */}
      {stage === 'generating' && mode === 'long' && (
        <div style={{ position: 'fixed', left: '-10000px', top: 0 }} aria-hidden>
          <div ref={longRef} style={{ width: 540, ...LIGHT_PALETTE }} className="bg-paper p-10">
            <ExcerptBooklet {...props} />
          </div>
        </div>
      )}
      {stage === 'generating' && mode === 'cards' && (
        <div style={{ position: 'fixed', left: '-10000px', top: 0 }} aria-hidden>
          {/* 문장을 나누려고 재는 카드 — 찍지 않는다 */}
          <QuoteCard
            cardRef={probeRef}
            page={{ text: '', tier: 0, part: 1, parts: 1, number: 1, source: '' }}
          />
          {/* 표지 카드 — 카드 타이포는 화면 토큰과 무관한 고정 px (quoteSizeClass 참고) */}
          <div
            ref={(el) => {
              cardRefs.current[0] = el;
            }}
            style={{ width: 540, height: 675, ...LIGHT_PALETTE }}
            className="bg-paper p-8"
          >
            <div className="h-full w-full border border-hairline p-1.5">
              <div className="flex h-full w-full flex-col items-center justify-center border border-hairline px-8 text-center">
                <Seal>{monthly ? '달의 발췌집' : '발췌집'}</Seal>
                <h2 className="mt-5 font-serif text-[24px] font-bold leading-snug text-ink">
                  {monthly ? monthly.label : bookTitle}
                </h2>
                {author && (
                  <p className="mt-3 font-serif text-[15px] font-normal leading-[1.75] text-ink-sub">
                    {author}
                  </p>
                )}
                {readingPeriod && (
                  <p className="mt-8 text-[13px] font-normal leading-5 tabular-nums text-ink-faint">
                    {readingPeriod}
                  </p>
                )}
                {monthly && <MonthlyBooks books={monthly.books} />}
              </div>
            </div>
          </div>
          {/* 문장 카드들 — 한 문장이 여러 장으로 이어질 수 있다 */}
          {cardPages?.map((page, i) => (
            <QuoteCard
              key={`${page.id}-${page.part}`}
              page={page}
              cardRef={(el) => {
                cardRefs.current[i + 1] = el;
              }}
            />
          ))}
          {/* 판권장 카드 */}
          <div
            ref={(el) => {
              cardRefs.current[(cardPages?.length ?? 0) + 1] = el;
            }}
            style={{ width: 540, height: 675, ...LIGHT_PALETTE }}
            className="bg-paper p-8"
          >
            <div className="flex h-full w-full flex-col items-center justify-center px-10 text-center">
              <p className="font-serif text-[15px] font-normal leading-[1.75] text-ink">
                {monthly ? `달의 발췌집 — ${monthly.label}` : <>『{bookTitle}』</>}
                {author ? ` — ${author}` : ''}
              </p>
              <p className="mt-3 font-serif text-[15px] font-normal leading-[1.75] text-ink-sub">
                {koreanCount(quotes.length)} 문장을 옮겨 적다
              </p>
              {readingPeriod && (
                <p className="mt-1.5 text-[13px] font-normal leading-5 tabular-nums text-ink-faint">
                  {readingPeriod}
                </p>
              )}
              <p className="mt-10 whitespace-nowrap font-sans text-seal uppercase text-ink-faint">
                READIARY
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
