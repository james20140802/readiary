'use client';

/* 임시 프리뷰 라우트 — 강조색 A/B 스크린샷용. 커밋 금지.
   실제 컴포넌트(Seal·Tabs·Chip·Button)와, accent를 쓰는 실화면 조각을
   동일한 클래스로 재현한다(mock 데이터, DB 무접촉). */

import Seal from '@/components/ui/Seal';
import Tabs from '@/components/ui/Tabs';
import Chip from '@/components/ui/Chip';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';

const DAYS = ['월', '화', '수', '목', '금', '토', '일'];

export default function DevPreviewPage() {
  return (
    <main className="mx-auto max-w-[680px] px-6 py-10 flex flex-col gap-8">
      {/* ── Navbar 조각: 활성 항목 + 알림 점 ── */}
      <nav className="flex items-center gap-6 border-b border-hairline pb-3">
        <span className="text-sm text-accent font-semibold">홈</span>
        <span className="text-sm text-ink-faint">서재</span>
        <span className="relative text-sm text-ink-faint">
          소셜
          <span className="absolute -top-0.5 -right-1 h-[7px] w-[7px] rounded-full bg-accent" />
        </span>
        <span className="text-sm text-ink-faint">프로필</span>
      </nav>

      {/* ── 주간 스트릭 ── */}
      <Card className="p-6">
        <div className="flex items-baseline justify-between">
          <p className="font-bold">
            이번 주 문장 <span className="text-accent">5</span>개
          </p>
          <a className="text-caption font-semibold text-accent hover:text-accent-hover shrink-0">
            이번 주 돌아보기
          </a>
        </div>
        <div className="mt-4 flex justify-between">
          {DAYS.map((d, i) => (
            <div key={d} className="flex flex-col items-center gap-1.5">
              <span
                className={`h-2 w-2 rounded-full ${i < 5 ? 'bg-accent' : 'bg-hairline-strong'}`}
              />
              <span
                className={`text-[10px] font-semibold ${i === 4 ? 'text-accent' : 'text-ink-faint'}`}
              >
                {d}
              </span>
            </div>
          ))}
        </div>
      </Card>

      {/* ── 읽는 중 책: 진행률 바 ── */}
      <Card className="p-6">
        <div className="flex items-baseline justify-between">
          <p className="font-bold">데미안</p>
          <span className="text-caption font-bold text-accent">62%</span>
        </div>
        <p className="text-caption text-ink-sub mt-0.5">헤르만 헤세</p>
        <div className="mt-3 h-1.5 w-full rounded-full bg-card-raised overflow-hidden">
          <div className="bg-accent h-full rounded-full" style={{ width: '62%' }} />
        </div>
      </Card>

      {/* ── 회상 카드: Seal + 세리프 인용 ── */}
      <Card className="p-6">
        <Seal>1년 전 오늘</Seal>
        <blockquote className="mt-3 font-serif text-[20px] leading-[1.85]">
          새는 알에서 나오려고 투쟁한다. 알은 세계이다. 태어나려는 자는 하나의 세계를 깨뜨려야 한다.
        </blockquote>
        <p className="mt-3 text-caption text-ink-faint">데미안 · 헤르만 헤세</p>
      </Card>

      {/* ── 발췌 리더 헤더: seal형 라벨 ── */}
      <div className="text-center border-y border-hairline py-8">
        <p className="font-sans text-seal text-accent uppercase">완독 · 발췌집</p>
        <p className="mt-2 font-serif text-2xl font-bold">데미안</p>
        <p className="mt-1 text-caption text-ink-faint">2026. 6. 12 – 8. 30 · 문장 14개</p>
      </div>

      {/* ── 탭 + 칩 + 댓글 카운트 ── */}
      <div className="flex flex-col gap-5">
        <Tabs
          tabs={[
            { label: '기록', value: 'entries' },
            { label: '발췌', value: 'excerpts' },
          ]}
          defaultValue="entries"
        />
        <div className="flex gap-2">
          <Chip selected dot>
            데미안
          </Chip>
          <Chip>수레바퀴 아래서</Chip>
        </div>
        <p className="text-sm font-bold">
          댓글 <span className="text-accent ml-1">3</span>
        </p>
      </div>

      {/* ── 버튼(참고: primary는 먹 배경) + 텍스트 링크 ── */}
      <div className="flex items-center gap-3">
        <Button variant="primary">문장 남기기</Button>
        <Button variant="secondary">모두 보기</Button>
        <a className="text-caption font-semibold text-accent hover:text-accent-hover">
          발췌집 보기 →
        </a>
      </div>
    </main>
  );
}
