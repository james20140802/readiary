import Link from 'next/link';
import Button from '@/components/ui/Button';
import SocialTopBar from '@/components/social/SocialTopBar';

/** 없는 권, 나만 보기로 돌린 권, 친구가 아닌 사이를 구별하지 않는 한 문구다 */
export default function NotFound() {
  return (
    <div className="pt-6">
      <SocialTopBar title="달의 발췌집" back={{ href: '/social/friends', label: '친구' }} />
      <h1 className="font-serif text-[22px] font-semibold leading-[1.5] text-ink">
        이 달의 발췌집을 열 수 없어요
      </h1>
      <p className="mt-2 font-sans text-body-sm text-ink-sub">
        없거나 지금은 볼 수 없는 발췌집이에요.
      </p>
      <Button asChild size="sm" variant="secondary" className="mt-6">
        <Link href="/social/friends">친구 목록 보기</Link>
      </Button>
    </div>
  );
}
