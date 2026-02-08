import { BadgeConditionDefinition } from '@/types/badges';

// 스트릭 계산용 헬퍼 함수
function checkStreakDays(dates: string[], targetDays: number): boolean {
  if (dates.length < targetDays) return false;

  const dateSet = new Set(dates);
  const today = new Date();

  for (let i = 0; i < targetDays; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const iso = d.toISOString().split('T')[0];
    if (!dateSet.has(iso)) return false;
  }
  return true;
}

export const badgeConditions: BadgeConditionDefinition[] = [
  {
    code: 'first_entry',
    description: '첫 독서 기록을 작성함',
    check: (data) => data.totalEntries > 0,
  },
  {
    code: 'first_finished_book',
    description: '처음으로 책 한 권을 완독함',
    check: (data) => data.finishedBookCount > 0,
  },
  // 독서 기록 개수 배지들
  {
    code: 'record_10',
    description: '독서 기록을 10개 작성함',
    check: (data) => data.totalEntries >= 10,
  },
  {
    code: 'record_30',
    description: '독서 기록을 30개 작성함',
    check: (data) => data.totalEntries >= 30,
  },
  {
    code: 'record_50',
    description: '독서 기록을 50개 작성함',
    check: (data) => data.totalEntries >= 50,
  },
  {
    code: 'record_100',
    description: '독서 기록을 100개 작성함',
    check: (data) => data.totalEntries >= 100,
  },
  {
    code: 'record_200',
    description: '독서 기록을 200개 작성함',
    check: (data) => data.totalEntries >= 200,
  },
  {
    code: 'record_365',
    description: '독서 기록을 365개 작성함',
    check: (data) => data.totalEntries >= 365,
  },
  {
    code: 'record_1000',
    description: '독서 기록을 1000개 작성함',
    check: (data) => data.totalEntries >= 1000,
  },

  // 완독 수 배지들
  {
    code: 'finish_3',
    description: '3권의 책을 완독함',
    check: (data) => data.finishedBookCount >= 3,
  },
  {
    code: 'finish_10',
    description: '10권의 책을 완독함',
    check: (data) => data.finishedBookCount >= 10,
  },
  {
    code: 'finish_50',
    description: '50권의 책을 완독함',
    check: (data) => data.finishedBookCount >= 50,
  },

  // 누적 페이지 배지들
  {
    code: 'page_100',
    description: '누적 100페이지 이상 읽음',
    check: (data) => data.totalPagesRead >= 100,
  },
  {
    code: 'page_500',
    description: '누적 500페이지 이상 읽음',
    check: (data) => data.totalPagesRead >= 500,
  },
  {
    code: 'page_1000',
    description: '누적 1000페이지 이상 읽음',
    check: (data) => data.totalPagesRead >= 1000,
  },

  // 스트릭(연속) 배지들
  {
    code: 'streak_3',
    description: '3일 연속으로 독서 기록을 남김',
    check: (data) => checkStreakDays(data.entryDates, 3),
  },
  {
    code: 'streak_7',
    description: '일주일 연속으로 독서 기록을 남김',
    check: (data) => checkStreakDays(data.entryDates, 7),
  },
  {
    code: 'streak_30',
    description: '한달 연속으로 독서 기록을 남김',
    check: (data) => checkStreakDays(data.entryDates, 30),
  },
  {
    code: 'streak_100',
    description: '100일 연속으로 독서 기록을 남김',
    check: (data) => checkStreakDays(data.entryDates, 100),
  },
  {
    code: 'streak_365',
    description: '일년 연속으로 독서 기록을 남김',
    check: (data) => checkStreakDays(data.entryDates, 365),
  },
];
