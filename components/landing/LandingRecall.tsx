import { format, parseISO, subMonths, subYears } from 'date-fns';
import Card from '@/components/ui/Card';
import Seal from '@/components/ui/Seal';
import { WeeklyStreakSection } from '@/app/protected/dashboard/_components/WeeklyStreakSection';
import { MonthlyRecapCard } from '@/app/protected/dashboard/_components/MonthlyRecapCard';
import { weekDatesKST } from '@/lib/dashboard/streak';
import { todayKST } from '@/lib/dates';
import SlideHeading from './SlideHeading';
import { SlideBody } from './Slide';
import { RECALL_DEMO, WEEK_PATTERN } from './demo';

/**
 * ③ 회고 — 지난 문장이 돌아오는 회상 카드(1년 전 오늘)와, 홈의 주간 리듬·지난달 회고를 실물로.
 * 날짜는 오늘 기준으로 계산해 언제 봐도 '1년 전 오늘'이 맞는다.
 */
export default function LandingRecall() {
  const todayKst = todayKST();
  const today = parseISO(todayKst);
  const yearAgo = format(subYears(today, 1), 'yyyy. M. d.');
  const lastMonth = format(subMonths(today, 1), 'M월');

  // 이번 주 무늬 — 오늘까지만 채우고, 오늘은 늘 기록한 날로
  const week = weekDatesKST(todayKst);
  const todayIndex = week.indexOf(todayKst);
  const weekActivity = week.map((_, i) =>
    i === todayIndex ? true : i < todayIndex && WEEK_PATTERN[i]
  );
  const weeklyCount = weekActivity.filter(Boolean).length + 2;

  return (
    <div>
      <SlideHeading
        eyebrow="회고"
        title="지난 문장이 돌아옵니다"
        body="지난날 적어 둔 문장이 회상 카드로 돌아오고, 이번 주의 리듬은 도장 한 줄로 남습니다. 매월 첫날엔 지난달의 기록을 돌아봐요."
      />

      <SlideBody className="mt-6 grid gap-4 md:mt-8 md:grid-cols-[3fr_2fr] md:items-start">
        <Card hoverable={false} variant="raised" className="px-[26px] pb-6 pt-[30px]">
          <Seal className="mb-3 block">1년 전 오늘</Seal>
          <span aria-hidden className="mb-2 block font-serif text-[40px] leading-none text-accent">
            “
          </span>
          <blockquote className="whitespace-pre-wrap font-serif text-quote text-ink">
            {RECALL_DEMO.quote}
          </blockquote>
          <div className="mt-[18px] flex items-baseline gap-2 border-t border-hairline pt-[14px]">
            <span className="font-serif text-[13px] font-bold text-ink">
              {RECALL_DEMO.bookTitle}
            </span>
            <span className="text-caption text-ink-faint">
              {RECALL_DEMO.bookAuthor} · {yearAgo}
            </span>
          </div>
        </Card>

        <div className="flex flex-col gap-4">
          <WeeklyStreakSection
            weeklyCount={weeklyCount}
            weekActivity={weekActivity}
            todayKst={todayKst}
          />
          <div className="hidden md:block">
            <MonthlyRecapCard
              recap={{ label: lastMonth, entryCount: 31, quoteCount: 23, bookCount: 4 }}
            />
          </div>
        </div>
      </SlideBody>
    </div>
  );
}
