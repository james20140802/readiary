'use client';

import Button from '@/components/ui/Button';
import Sheet from '@/components/ui/Sheet';

interface PhotoConsentSheetProps {
  open: boolean;
  saving: boolean;
  /** 동의를 남기지 못했을 때의 안내 */
  error: string | null;
  onAgree(): void;
  onClose(): void;
}

/**
 * 사진 글자 읽기를 처음 쓸 때 받는 동의. 문구를 바꾸면 lib/photo-quote/config.ts의
 * PHOTO_TEXT_COPY_VERSION을 올려 모두에게 다시 묻는다(설계 문서 "동의" 절).
 */
export default function PhotoConsentSheet({
  open,
  saving,
  error,
  onAgree,
  onClose,
}: PhotoConsentSheetProps) {
  return (
    <Sheet open={open} onClose={onClose} ariaLabel="사진 글자 읽기 동의">
      <h2 className="font-sans text-[18px] font-bold text-ink">사진 속 글자를 읽으려면</h2>
      <p className="mt-3 font-sans text-body text-ink-sub">
        찍은 사진은 글자를 읽기 위해 Google(미국)의 서버로 전송됩니다. Readiary는 사진을 저장하지
        않으며, Google도 읽은 뒤 사진을 보관하지 않고 학습에 쓰지 않는다고 밝히고 있습니다. 사진에
        함께 찍힌 손이나 메모도 전송되니, 책 페이지만 담아 주세요. 동의하지 않아도 문장을 직접 적어
        기록할 수 있습니다.
      </p>
      {error && (
        <p role="alert" className="mt-3 font-sans text-caption font-medium text-danger">
          {error}
        </p>
      )}
      <div className="mt-5 flex flex-col gap-2 sm:flex-row-reverse">
        <Button onClick={onAgree} disabled={saving} className="sm:flex-1">
          {saving ? '남기는 중…' : '동의하고 계속'}
        </Button>
        <Button variant="secondary" onClick={onClose} disabled={saving} className="sm:flex-1">
          취소
        </Button>
      </div>
    </Sheet>
  );
}
