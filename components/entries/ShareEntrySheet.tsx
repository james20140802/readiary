'use client';

import { useRef, useState } from 'react';
import { toPng } from 'html-to-image';
import { toast } from 'sonner';
import { createSupabaseClient } from '@/lib/supabase/client';
import { formatDateLabel } from '@/lib/share/format';
import { LIGHT_PALETTE } from '@/lib/share/palette';
import Button from '@/components/ui/Button';
import Sheet from '@/components/ui/Sheet';
import SentenceCard from './SentenceCard';

interface Props {
  open: boolean;
  onClose: () => void;
  entryId: string;
  quote: string | null;
  note: string | null;
  date: string;
  bookTitle: string;
  bookAuthor?: string | null;
}

/**
 * 문장 카드로 공유하는 시트(시안 entry-layer.html #share).
 * '이미지 저장'은 카드 그림만 내려받는다 — 공유 링크를 열거나 복사하지 않는다.
 * '공유하기'만 공유 링크를 열고 기기의 공유 창으로 보낸다. 공유 창이 없으면 내려받기 + 링크 복사.
 */
export default function ShareEntrySheet({
  open,
  onClose,
  entryId,
  quote,
  note,
  date,
  bookTitle,
  bookAuthor,
}: Props) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [busy, setBusy] = useState(false);

  const run = async (mode: 'share' | 'save') => {
    if (!cardRef.current || busy) return;
    setBusy(true);
    try {
      const dataUrl = await toPng(cardRef.current, { pixelRatio: 2, cacheBust: true });
      const blob = await (await fetch(dataUrl)).blob();
      const file = new File([blob], 'readiary-sentence.png', { type: 'image/png' });
      const download = () => {
        const anchor = document.createElement('a');
        anchor.href = dataUrl;
        anchor.download = 'readiary-sentence.png';
        anchor.click();
      };

      if (mode === 'save') {
        download();
        toast.success('카드 이미지를 저장했어요.');
        return;
      }

      const { data: enabled, error } = await createSupabaseClient().rpc('enable_entry_share', {
        p_entry_id: entryId,
      });
      if (error || !enabled) throw new Error('공유 링크를 만들 수 없습니다.');
      const shareUrl = `${window.location.origin}/share/e/${entryId}`;

      if (typeof navigator.share === 'function' && navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: 'Readiary 문장 카드', url: shareUrl });
      } else {
        download();
        let linkCopied = true;
        try {
          await navigator.clipboard.writeText(shareUrl);
        } catch {
          linkCopied = false;
        }
        toast.success(
          linkCopied ? '이미지를 저장하고 공유 링크를 복사했어요.' : '카드 이미지를 저장했어요.'
        );
      }
    } catch (error) {
      if ((error as DOMException)?.name !== 'AbortError') {
        console.error('카드 공유 실패:', error);
        toast.error('카드를 공유하지 못했어요.');
      }
    } finally {
      setBusy(false);
    }
  };

  const close = () => {
    if (!busy) onClose();
  };

  return (
    <>
      <Sheet open={open} onClose={close} title="문장 카드로 공유">
        {/* 받는 사람이 보게 될 카드 — 밤에도 낮 종이로 찍히므로 미리보기도 낮 팔레트로 */}
        <div
          style={LIGHT_PALETTE}
          className="mx-2 mt-1.5 -rotate-1 rounded-[4px] bg-paper px-6 py-[26px] text-ink shadow-[0_18px_40px_-18px_rgb(30_20_10/.5)] motion-reduce:rotate-0"
        >
          {quote && (
            <p className="line-clamp-6 whitespace-pre-wrap font-serif text-[21px] font-semibold leading-[1.65]">
              {quote}
            </p>
          )}
          {note && (
            <p
              className={`line-clamp-3 whitespace-pre-wrap font-serif text-[16px] leading-[1.6] text-ink-sub ${quote ? 'mt-2' : ''}`}
            >
              {note}
            </p>
          )}
          <small className="mt-3.5 block font-sans text-[13px] font-medium text-ink-sub">
            {bookTitle}
            {bookAuthor ? ` · ${bookAuthor}` : ''}
          </small>
        </div>
        <p className="mt-[22px] font-sans text-caption leading-[1.55] text-ink-sub">
          공유하면 링크를 가진 누구나 이 문장과 그때의 생각을 볼 수 있어요. 덧붙인 생각은 담기지
          않아요. 나만 보기로 바꾸면 링크가 닫혀요.
        </p>
        <div className="mt-4 flex gap-2">
          <Button
            variant="secondary"
            className="flex-1"
            disabled={busy}
            onClick={() => void run('save')}
          >
            이미지 저장
          </Button>
          <Button className="flex-1" disabled={busy} onClick={() => void run('share')}>
            {busy ? '카드를 만드는 중…' : '공유하기'}
          </Button>
        </div>
      </Sheet>

      {/* 오프스크린 캡처 대상: 540×675(4:5) → pixelRatio 2 = 1080×1350 */}
      {open && (
        <div style={{ position: 'fixed', left: '-10000px', top: 0 }} aria-hidden>
          <div
            ref={cardRef}
            style={{ width: 540, height: 675, ...LIGHT_PALETTE }}
            className="flex flex-col justify-center overflow-hidden bg-paper p-12"
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
      )}
    </>
  );
}
