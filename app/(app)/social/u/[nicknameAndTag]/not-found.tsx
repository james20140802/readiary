import Link from 'next/link';
import Button from '@/components/ui/Button';
import SocialTopBar from '@/components/social/SocialTopBar';

export default function NotFound() {
  return (
    <div className="pt-6">
      <SocialTopBar title="서재" back={{ href: '/social/friends', label: '친구' }} />
      <h1 className="font-serif text-[22px] font-semibold leading-[1.5] text-ink">
        이 서재를 열 수 없어요
      </h1>
      <p className="mt-2 font-sans text-body-sm text-ink-sub">
        없는 사람이거나 아직 친구가 아니에요. 친구가 되면 서로의 서재를 볼 수 있어요.
      </p>
      <Button asChild size="sm" variant="secondary" className="mt-6">
        <Link href="/social/friends">친구 찾기</Link>
      </Button>
    </div>
  );
}
