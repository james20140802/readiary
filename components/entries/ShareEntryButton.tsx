'use client';

import { useRef, useState } from 'react';
import { Share2 } from 'lucide-react';
import { toPng } from 'html-to-image';
import { toast } from 'sonner';
import type { CSSProperties } from 'react';
import SentenceCard from '@/components/entries/SentenceCard';
import { formatDateLabel } from '@/lib/share/format';

interface Props {
  entryId: string;
  quote: string | null;
  note: string | null;
  date: string;
  isPrivate: boolean;
  bookTitle: string;
  bookAuthor?: string | null;
}

/* 캡처 컨테이너는 뷰어의 다크모드와 무관하게 항상 라이트 팔레트로 찍는다.
   토큰 클래스가 CSS 변수를 읽으므로, 컨테이너에서 변수를 라이트 값으로 재정의. */
const LIGHT_PALETTE: CSSProperties = {
  '--paper': '247 243 236',
  '--card': '253 251 247',
  '--card-raised': '242 236 225',
  '--ink': '34 30 26',
  '--ink-sub': '110 102 92',
  '--ink-faint': '163 154 141',
  '--hairline': '227 220 208',
} as CSSProperties;

export default function ShareEntryButton({
  entryId,
  quote,
  note,
  date,
  isPrivate,
  bookTitle,
  bookAuthor,
}: Props) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [isSharing, setIsSharing] = useState(false);

  if (isPrivate) return null;

  const handleShare = async () => {
    if (!cardRef.current || isSharing) return;
    setIsSharing(true);
    try {
      const dataUrl = await toPng(cardRef.current, { pixelRatio: 2, cacheBust: true });
      const blob = await (await fetch(dataUrl)).blob();
      const file = new File([blob], 'readiary-sentence.png', { type: 'image/png' });
      const shareUrl = `${window.location.origin}/share/e/${entryId}`;

      if (typeof navigator.share === 'function' && navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: 'Readiary 문장 카드',
          url: shareUrl,
        });
      } else {
        const anchor = document.createElement('a');
        anchor.href = dataUrl;
        anchor.download = 'readiary-sentence.png';
        anchor.click();
        let linkCopied = true;
        try {
          await navigator.clipboard.writeText(shareUrl);
        } catch {
          linkCopied = false;
        }
        toast.success(
          linkCopied
            ? '카드 이미지를 저장하고 공유 링크를 복사했습니다.'
            : '카드 이미지를 저장했습니다.'
        );
      }
    } catch (error) {
      if ((error as DOMException)?.name !== 'AbortError') {
        console.error('카드 공유 실패:', error);
        toast.error('카드 공유에 실패했습니다.');
      }
    } finally {
      setIsSharing(false);
    }
  };

  return (
    <>
      <button
        onClick={handleShare}
        disabled={isSharing}
        className="flex items-center gap-1.5 text-caption font-medium text-ink-faint hover:text-ink-sub transition-colors disabled:opacity-50"
        title="문장 카드 공유"
      >
        <Share2 size={16} />
        공유
      </button>

      {/* 오프스크린 캡처 대상: 540×675(4:5) → pixelRatio 2 = 1080×1350 */}
      <div style={{ position: 'fixed', left: '-10000px', top: 0 }} aria-hidden>
        <div
          ref={cardRef}
          style={{ width: 540, height: 675, ...LIGHT_PALETTE }}
          className="bg-paper flex flex-col justify-center p-12 overflow-hidden"
        >
          <SentenceCard
            quote={quote}
            note={note}
            bookTitle={bookTitle}
            bookAuthor={bookAuthor}
            dateLabel={formatDateLabel(date)}
            showWordmark
            collapsed
          />
        </div>
      </div>
    </>
  );
}
