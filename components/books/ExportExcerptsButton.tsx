'use client';

import { useEffect, useRef, useState } from 'react';
import { toBlob } from 'html-to-image';
import { toast } from 'sonner';
import Seal from '@/components/ui/Seal';
import Button from '@/components/ui/Button';
import ExcerptBooklet, { ExcerptBookletProps, koreanCount } from './ExcerptBooklet';
import { LIGHT_PALETTE } from '@/lib/share/palette';
import { formatReadingPeriod } from '@/lib/dates';

type ExportMode = 'long' | 'cards';
type Stage = 'choose' | 'generating' | 'preview';

// iOS Safari의 캔버스 픽셀 상한(약 16.7M px) — 넘으면 캡처가 빈/잘린 이미지가 된다.
// 문장이 많은 발췌집의 '한 장으로' 내보내기는 이 상한 아래로 배율을 낮춰 찍는다.
const SAFE_CANVAS_AREA = 16_000_000;

function pixelRatioFor(el: HTMLElement): number {
  const { width, height } = el.getBoundingClientRect();
  if (width <= 0 || height <= 0) return 2;
  const maxRatio = Math.sqrt(SAFE_CANVAS_AREA / (width * height));
  return Math.min(2, Math.max(1, Math.floor(maxRatio * 10) / 10));
}

/**
 * 카드 한 장(4:5)에 들어갈 인용의 글자 크기 — 길수록 작게, 넘치면 잘라낸다.
 * whitespace-pre-wrap이라 명시적 줄바꿈이 그대로 살아나므로, 글자 수만으로는
 * 짧은 시(줄 많음)의 렌더 높이를 놓친다 — 줄 수도 티어 결정에 넣고,
 * 각 티어의 line-clamp는 카드의 인용 영역 높이(약 520px)에 맞춘 상한이다.
 */
function quoteSizeClass(quote: string): string {
  const length = quote.length;
  const lines = quote.split('\n').length;
  if (length <= 80 && lines <= 4) return 'text-[21px] leading-[1.9] line-clamp-[10]';
  if (length <= 200 && lines <= 9) return 'text-[18px] leading-[1.85] line-clamp-[13]';
  if (length <= 420 && lines <= 14) return 'text-[15.5px] leading-[1.8] line-clamp-[16]';
  return 'text-[13.5px] leading-[1.75] line-clamp-[20]';
}

/**
 * 발췌집 이미지 내보내기 — 긴 이미지 한 장 또는 4:5 카드 여러 장.
 *
 * 캡처(수 초)가 끝난 뒤 곧바로 navigator.share를 부르면 Safari가
 * 사용자 제스처가 아니라며 거부한다. 그래서 생성 결과를 미리보기 시트로
 * 보여주고, 공유·저장은 시트 안의 버튼(새 탭 제스처)에서 일어난다.
 */
export default function ExportExcerptsButton(props: ExcerptBookletProps) {
  const { bookTitle, author, quotes, entryDates } = props;
  const longRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [stage, setStage] = useState<Stage | null>(null);
  const [mode, setMode] = useState<ExportMode | null>(null);
  // 카드가 수십 장이어도 탭 메모리가 버티도록 base64 data URL 대신
  // Blob(File) + object URL만 쥔다 — 미리보기 디코드는 lazy 로딩에 맡긴다.
  const [files, setFiles] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);

  const readingPeriod = formatReadingPeriod(entryDates);

  const close = () => {
    previewUrls.forEach((url) => URL.revokeObjectURL(url));
    setStage(null);
    setMode(null);
    setFiles([]);
    setPreviewUrls([]);
  };

  useEffect(() => {
    if (stage !== 'generating' || !mode) return;
    let cancelled = false;
    (async () => {
      try {
        await document.fonts.ready;
        await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
        const targets = (mode === 'long' ? [longRef.current] : cardRefs.current).filter(
          (el): el is HTMLDivElement => el != null
        );
        if (targets.length === 0) throw new Error('캡처 대상 없음');
        if (mode === 'long') {
          const { width, height } = targets[0].getBoundingClientRect();
          if (width * height > SAFE_CANVAS_AREA) {
            toast.error('문장이 많아 한 장으로는 내보낼 수 없어요. 카드로 나누어를 이용해 주세요.');
            if (!cancelled) setStage('choose');
            return;
          }
        }
        // Safari는 첫 캡처에서 웹폰트가 빠지는 일이 있어 한 번 버리고 시작한다
        await toBlob(targets[0], { pixelRatio: pixelRatioFor(targets[0]), cacheBust: true });
        const nextFiles: File[] = [];
        const nextUrls: string[] = [];
        for (let i = 0; i < targets.length; i++) {
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
          setFiles(nextFiles);
          setPreviewUrls(nextUrls);
          setStage('preview');
        } else {
          nextUrls.forEach((url) => URL.revokeObjectURL(url));
        }
      } catch (error) {
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
  }, [stage, mode]);

  const handleSave = () => {
    files.forEach((file, i) => {
      const blobUrl = previewUrls[i];
      setTimeout(() => {
        const anchor = document.createElement('a');
        anchor.href = blobUrl;
        anchor.download = file.name;
        anchor.click();
      }, i * 300);
    });
    toast.success(
      files.length === 1
        ? '발췌집 이미지를 저장했습니다.'
        : `이미지 ${files.length}장을 저장했습니다.`
    );
  };

  // http dev 서버 같은 비보안 컨텍스트에는 navigator.share가 아예 없다
  const canUseShareSheet =
    typeof navigator !== 'undefined' && typeof navigator.share === 'function';

  const handleShare = async () => {
    if (typeof navigator.share === 'function' && navigator.canShare?.({ files })) {
      try {
        await navigator.share({ files, title: `발췌집 — ${bookTitle}` });
      } catch (error) {
        if ((error as DOMException)?.name !== 'AbortError') {
          console.error('발췌집 공유 실패:', error);
          toast.error('공유에 실패했습니다.');
        }
      }
    } else {
      handleSave();
    }
  };

  return (
    <>
      <button
        onClick={() => setStage('choose')}
        className="font-serif text-[12.5px] text-accent transition-colors hover:underline"
      >
        이미지로 내보내기 →
      </button>

      {stage && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center sm:items-center"
          role="dialog"
          aria-modal="true"
          aria-label="발췌집 이미지 내보내기"
        >
          <div className="absolute inset-0 bg-ink/40" onClick={close} />
          <div className="relative flex max-h-[85vh] w-full max-w-lg flex-col rounded-t-md border border-hairline bg-paper p-5 sm:rounded-md">
            {stage === 'choose' && (
              <>
                <p className="font-serif text-[15px] font-bold text-ink">이미지로 내보내기</p>
                <div className="mt-4 space-y-3">
                  <button
                    onClick={() => {
                      setMode('long');
                      setStage('generating');
                    }}
                    className="w-full rounded-md border border-hairline px-4 py-3 text-left transition-colors hover:border-hairline-strong"
                  >
                    <p className="font-serif text-[14px] text-ink">한 장으로</p>
                    <p className="mt-0.5 text-[12px] text-ink-faint">
                      표지부터 판권장까지 세로로 긴 이미지 하나
                    </p>
                  </button>
                  <button
                    onClick={() => {
                      setMode('cards');
                      setStage('generating');
                    }}
                    className="w-full rounded-md border border-hairline px-4 py-3 text-left transition-colors hover:border-hairline-strong"
                  >
                    <p className="font-serif text-[14px] text-ink">카드로 나누어</p>
                    <p className="mt-0.5 text-[12px] text-ink-faint">
                      표지·문장·판권장을 4:5 카드 {quotes.length + 2}장으로 — 스토리·피드용
                    </p>
                  </button>
                </div>
                <div className="mt-4 text-right">
                  <button
                    onClick={close}
                    className="text-[12.5px] text-ink-faint transition-colors hover:text-ink-sub"
                  >
                    닫기
                  </button>
                </div>
              </>
            )}

            {stage === 'generating' && (
              <p className="py-10 text-center font-serif text-[13.5px] text-ink-faint">
                발췌집을 조판하는 중…
              </p>
            )}

            {stage === 'preview' && (
              <>
                <p className="font-serif text-[14px] text-ink">
                  {previewUrls.length === 1
                    ? '이미지가 준비됐습니다'
                    : `카드 ${previewUrls.length}장이 준비됐습니다`}
                </p>
                {!canUseShareSheet && (
                  <p className="mt-1 text-[12px] leading-relaxed text-ink-faint">
                    이 환경에서는 공유 시트를 열 수 없어요. 아이패드·아이폰에서는 이미지를 길게 눌러
                    &lsquo;사진에 저장&rsquo;을 선택하세요.
                  </p>
                )}
                <div className="mt-3 min-h-0 flex-1 space-y-3 overflow-y-auto">
                  {previewUrls.map((src, i) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      key={i}
                      src={src}
                      alt={`발췌집 이미지 ${i + 1}`}
                      loading="lazy"
                      decoding="async"
                      className="w-full border border-hairline"
                    />
                  ))}
                </div>
                <div className="mt-4 flex items-center justify-end gap-4">
                  <button
                    onClick={close}
                    className="text-[12.5px] text-ink-faint transition-colors hover:text-ink-sub"
                  >
                    닫기
                  </button>
                  {canUseShareSheet ? (
                    <>
                      <button
                        onClick={handleSave}
                        className="text-[12.5px] text-ink-sub transition-colors hover:text-ink"
                      >
                        저장
                      </button>
                      <Button size="sm" variant="primary" onClick={handleShare}>
                        공유하기
                      </Button>
                    </>
                  ) : (
                    <Button size="sm" variant="primary" onClick={handleSave}>
                      저장
                    </Button>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}

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
          {/* 표지 카드 */}
          <div
            ref={(el) => {
              cardRefs.current[0] = el;
            }}
            style={{ width: 540, height: 675, ...LIGHT_PALETTE }}
            className="bg-paper p-8"
          >
            <div className="h-full w-full border border-hairline p-1.5">
              <div className="flex h-full w-full flex-col items-center justify-center border border-hairline px-8 text-center">
                <Seal>발췌집</Seal>
                <h2 className="mt-5 font-serif text-[28px] font-bold leading-snug text-ink">
                  {bookTitle}
                </h2>
                {author && <p className="mt-3 font-serif text-[14px] text-ink-sub">{author}</p>}
                {readingPeriod && (
                  <p className="mt-8 text-[12px] tabular-nums text-ink-faint">{readingPeriod}</p>
                )}
              </div>
            </div>
          </div>
          {/* 문장 카드들 */}
          {quotes.map((q, i) => (
            <div
              key={q.id}
              ref={(el) => {
                cardRefs.current[i + 1] = el;
              }}
              style={{ width: 540, height: 675, ...LIGHT_PALETTE }}
              className="bg-paper"
            >
              <div className="flex h-full w-full flex-col px-12 py-10">
                <div className="text-center font-serif text-[13px] tabular-nums text-accent">
                  {i + 1}
                </div>
                <div className="flex min-h-0 flex-1 items-center justify-center">
                  <blockquote
                    className={`whitespace-pre-wrap text-center font-serif text-ink ${quoteSizeClass(
                      q.quote
                    )}`}
                  >
                    {q.quote}
                  </blockquote>
                </div>
                <div className="text-center">
                  <p className="truncate font-serif text-[12.5px] text-ink-sub">
                    『{bookTitle}』{author ? ` — ${author}` : ''}
                  </p>
                  <p className="mt-2 whitespace-nowrap font-sans text-seal uppercase text-ink-faint">
                    READIARY
                  </p>
                </div>
              </div>
            </div>
          ))}
          {/* 판권장 카드 */}
          <div
            ref={(el) => {
              cardRefs.current[quotes.length + 1] = el;
            }}
            style={{ width: 540, height: 675, ...LIGHT_PALETTE }}
            className="bg-paper p-8"
          >
            <div className="flex h-full w-full flex-col items-center justify-center px-10 text-center">
              <p className="font-serif text-[15px] text-ink">
                『{bookTitle}』{author ? ` — ${author}` : ''}
              </p>
              <p className="mt-3 font-serif text-[13.5px] text-ink-sub">
                {koreanCount(quotes.length)} 문장을 옮겨 적다
              </p>
              {readingPeriod && (
                <p className="mt-1.5 text-[12px] tabular-nums text-ink-faint">{readingPeriod}</p>
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
