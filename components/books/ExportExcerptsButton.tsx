'use client';

import { useRef, useState } from 'react';
import { toPng } from 'html-to-image';
import { toast } from 'sonner';
import ExcerptBooklet, { ExcerptBookletProps } from './ExcerptBooklet';
import { LIGHT_PALETTE } from '@/lib/share/palette';

/**
 * 발췌집 전체를 세로로 긴 이미지 한 장으로 내보낸다.
 * 오프스크린에 라이트 팔레트로 같은 소책자를 조판해 두고 캡처하는 방식
 * (ShareEntryButton과 같은 문법).
 */
export default function ExportExcerptsButton(props: ExcerptBookletProps) {
  const bookletRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    if (!bookletRef.current || isExporting) return;
    setIsExporting(true);
    try {
      const dataUrl = await toPng(bookletRef.current, { pixelRatio: 2, cacheBust: true });
      const blob = await (await fetch(dataUrl)).blob();
      const file = new File([blob], 'readiary-excerpts.png', { type: 'image/png' });

      if (typeof navigator.share === 'function' && navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: `발췌집 — ${props.bookTitle}` });
      } else {
        const anchor = document.createElement('a');
        anchor.href = dataUrl;
        anchor.download = 'readiary-excerpts.png';
        anchor.click();
        toast.success('발췌집 이미지를 저장했습니다.');
      }
    } catch (error) {
      if ((error as DOMException)?.name !== 'AbortError') {
        console.error('발췌집 내보내기 실패:', error);
        toast.error('내보내기에 실패했습니다.');
      }
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <>
      <button
        onClick={handleExport}
        disabled={isExporting}
        className="font-serif text-[12.5px] text-accent transition-colors hover:underline disabled:opacity-50"
      >
        {isExporting ? '내보내는 중…' : '이미지로 내보내기 →'}
      </button>

      {/* 오프스크린 캡처 대상: 540px 폭 → pixelRatio 2 = 1080px, 높이는 내용에 따라 */}
      <div style={{ position: 'fixed', left: '-10000px', top: 0 }} aria-hidden>
        <div ref={bookletRef} style={{ width: 540, ...LIGHT_PALETTE }} className="bg-paper p-10">
          <ExcerptBooklet {...props} />
        </div>
      </div>
    </>
  );
}
