'use client';

import { useEffect, useRef, useState } from 'react';
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
 * 문장 카드로 공유하는 시트(시안 entry-layer.html #share). 링크와 이미지는 따로 보낸다.
 *
 * - '링크 복사': 공유 링크를 열고 그 주소만 클립보드에 넣는다.
 * - '이미지로 공유': 카드 그림만 기기의 공유 창으로 보낸다(인스타·카톡·사진 저장). 링크는 열지 않는다.
 *   공유 창이 파일을 받지 못하면(데스크톱 등) 그림을 내려받는다.
 *
 * 공유 창에 파일과 링크를 함께 넘기면 macOS Chrome의 '링크 복사'가 둘을 한 줄로 이어 붙여
 * 주소 뒤에 내 컴퓨터의 파일 경로가 붙는다. 그래서 둘을 섞지 않는다.
 *
 * Safari는 캡처처럼 오래 걸린 비동기 작업 뒤의 공유·클립보드 호출을 사용자 제스처가 아니라며 거부한다.
 * 그래서 카드는 시트가 열릴 때 미리 찍어 두고, 링크는 공유를 켜는 동안 ClipboardItem에 약속으로 넘긴다.
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
  const [image, setImage] = useState<File | null>(null);
  const [capturing, setCapturing] = useState(false);
  const [linkBusy, setLinkBusy] = useState(false);

  // 시트가 열리면 카드를 미리 찍어 둔다 — 버튼을 누른 순간 곧바로 공유 창을 열 수 있게
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    const id = window.setTimeout(() => {
      void capture().then((file) => {
        if (!cancelled) setImage(file);
      });
    }, 0);
    return () => {
      cancelled = true;
      window.clearTimeout(id);
      setImage(null);
    };
  }, [open, quote, note, bookTitle, bookAuthor, date]);

  async function capture(): Promise<File | null> {
    if (!cardRef.current) return null;
    setCapturing(true);
    try {
      await document.fonts?.ready;
      const dataUrl = await toPng(cardRef.current, { pixelRatio: 2, cacheBust: true });
      const blob = await (await fetch(dataUrl)).blob();
      return new File([blob], 'readiary-sentence.png', { type: 'image/png' });
    } catch (error) {
      console.error('카드 이미지 만들기 실패:', error);
      return null;
    } finally {
      setCapturing(false);
    }
  }

  const canShareImage =
    image !== null &&
    typeof navigator !== 'undefined' &&
    typeof navigator.share === 'function' &&
    navigator.canShare?.({ files: [image] }) === true;

  const download = (file: File) => {
    const url = URL.createObjectURL(file);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = file.name;
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
  };

  const shareImage = async () => {
    if (capturing) return;
    if (image && canShareImage) {
      try {
        await navigator.share({ files: [image] });
      } catch (error) {
        if ((error as DOMException)?.name !== 'AbortError') {
          console.error('카드 공유 실패:', error);
          toast.error('카드를 공유하지 못했어요.');
        }
      }
      return;
    }
    // 미리 찍지 못했으면 지금 찍는다 — 내려받기는 제스처가 없어도 된다
    const file = image ?? (await capture());
    if (!file) {
      toast.error('카드 이미지를 만들지 못했어요.');
      return;
    }
    setImage(file);
    download(file);
    toast.success('카드 이미지를 저장했어요.');
  };

  const copyLink = async () => {
    if (linkBusy) return;
    setLinkBusy(true);
    const shareUrl = `${window.location.origin}/share/e/${entryId}`;
    let enabled = false;
    // 공유 켜기는 한 번만 — 클립보드 방식이 바뀌어도 다시 부르지 않는다
    const enabling = (async () => {
      const { data, error } = await createSupabaseClient().rpc('enable_entry_share', {
        p_entry_id: entryId,
      });
      if (error || !data) throw new Error('공유 링크를 만들 수 없습니다.');
      enabled = true;
    })();
    try {
      let copied = false;
      if (
        typeof ClipboardItem !== 'undefined' &&
        typeof navigator.clipboard?.write === 'function'
      ) {
        try {
          // 공유가 켜진 뒤에만 주소가 들어간다 — 켜지 못하면 클립보드는 그대로다
          await navigator.clipboard.write([
            new ClipboardItem({
              'text/plain': enabling.then(() => new Blob([shareUrl], { type: 'text/plain' })),
            }),
          ]);
          copied = true;
        } catch {
          // ClipboardItem에 약속을 넘기지 못하는 브라우저 — 아래에서 켠 뒤 글자로 넣는다
        }
      }
      await enabling;
      if (!copied) await navigator.clipboard.writeText(shareUrl);
      toast.success('링크를 복사했어요.');
    } catch (error) {
      console.error('공유 링크 복사 실패:', error);
      toast.error(
        enabled ? '링크를 복사하지 못했어요. 다시 눌러 주세요.' : '공유 링크를 만들지 못했어요.'
      );
    } finally {
      setLinkBusy(false);
    }
  };

  const close = () => {
    if (!linkBusy) onClose();
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
          링크를 복사하면 링크를 가진 누구나 이 문장과 그때의 생각을 볼 수 있어요. 덧붙인 생각은
          담기지 않아요. 이미지로 공유할 때는 링크가 열리지 않아요. 나만 보기로 바꾸면 링크가
          닫혀요.
        </p>
        <div className="mt-4 flex gap-2">
          <Button
            variant="secondary"
            className="flex-1"
            disabled={linkBusy}
            onClick={() => void copyLink()}
          >
            {linkBusy ? '링크를 여는 중…' : '링크 복사'}
          </Button>
          <Button className="flex-1" disabled={capturing} onClick={() => void shareImage()}>
            {capturing ? '카드를 만드는 중…' : canShareImage ? '이미지로 공유' : '이미지 저장'}
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
