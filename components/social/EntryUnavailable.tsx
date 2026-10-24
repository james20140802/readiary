import Link from 'next/link';
import Button from '@/components/ui/Button';
import SocialTopBar from '@/components/social/SocialTopBar';

/** 친구의 기록을 열 수 없을 때 — 왜 그런지 한 줄, 서재로 돌아가는 길 */
export default function EntryUnavailable({
  libraryHref,
  message,
}: {
  libraryHref: string;
  message: string;
}) {
  return (
    <div className="pt-6">
      <SocialTopBar title="기록" back={{ href: libraryHref, label: '서재' }} />
      <p className="font-serif text-[22px] font-semibold leading-[1.5] text-ink">{message}</p>
      <p className="mt-2 font-sans text-body-sm text-ink-sub">
        친구가 &lsquo;친구에게 보임&rsquo;으로 남긴 기록만 열 수 있어요.
      </p>
      <Button asChild size="sm" variant="secondary" className="mt-6">
        <Link href={libraryHref}>서재로 돌아가기</Link>
      </Button>
    </div>
  );
}
