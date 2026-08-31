import AnimatedSection from '@/components/ui/AnimatedSection';
import Composer from './_components/Composer';
import { InProgressBooksStack } from './_components/InProgressBooksStack';
import { NoBooksSection } from './_components/NoBooksSection';
import { WeeklyStreakSection } from './_components/WeeklyStreakSection';
import { RecallCard } from './_components/RecallCard';
import { MonthlyRecapCard } from './_components/MonthlyRecapCard';
import { QuoteBoard, type StickyNote } from './_components/QuoteBoard';
import { ExLibrisPanel } from './_components/ExLibrisPanel';
import GreetingHeader from './_components/GreetingHeader';
import { fetchDashboardData } from '@/lib/dashboard/fetchDashboardData';
import { fetchRecentEntries, latestTextByUserBook } from '@/lib/dashboard/fetchRecentEntries';
import { fetchRecallEntry } from '@/lib/recall/fetchRecallEntry';
import { fetchMonthlyRecap } from '@/lib/retrospect/fetchMonthlyRecap';
import { fetchDetailSocialFeedEntries } from '@/lib/queries/fetchSocialFeedEntries';
import { getUserStats } from '@/lib/stats/getUserStats';
import { notFound } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export default async function DashboardPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const [data, recall, recap, { data: profile }, recentEntries, friendFeed, stats] =
    await Promise.all([
      fetchDashboardData(),
      fetchRecallEntry(),
      fetchMonthlyRecap(),
      supabase.from('profiles').select('name').eq('id', user?.id).single(),
      fetchRecentEntries(50),
      fetchDetailSocialFeedEntries(0, 2),
      getUserStats(user.id),
    ]);
  if (!data) return notFound();

  const { books, weekActivity, recentUserBookId, todayKst, weeklyCount } = data;

  // 책 더미: 책마다 마지막으로 남긴 문장 한 줄
  const latestTexts = latestTextByUserBook(recentEntries);

  // 문장 보드: 내 최신 기록 몇 개 + 친구의 공개 문장을 시간순으로 섞는다
  const myNotes: Omit<StickyNote, 'narrowHidden'>[] = recentEntries.slice(0, 6).map((e) => ({
    id: e.id,
    kind: 'mine' as const,
    friendName: null,
    quote: e.quote,
    note: e.note,
    bookTitle: e.bookTitle,
    bookAuthor: e.bookAuthor,
    date: e.date,
    createdAt: e.createdAt,
    href: `/protected/entry/${e.id}`,
  }));
  const friendNotes: Omit<StickyNote, 'narrowHidden'>[] = friendFeed.map((f) => ({
    id: f.entry.id,
    kind: 'friend' as const,
    friendName: f.profile.name,
    quote: f.entry.quote,
    note: f.entry.note,
    bookTitle: f.entry.book.title,
    bookAuthor: f.entry.book.author,
    date: f.entry.date,
    createdAt: f.entry.created_at,
    href: `/protected/social/u/${f.profile.nickname}-${f.profile.tag}/entry/${f.entry.id}`,
  }));
  // 최신순으로 6개를 뽑되(좁은 화면에선 그중 최신 4개만 보임),
  // 붙이는 순서는 일부러 섞는다 — 손으로 붙인 포스트잇은 시간순으로 정렬돼 있지 않으니.
  const latestSix = [...myNotes, ...friendNotes]
    .filter((n) => (n.quote ?? n.note) != null)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 6);
  const narrowVisible = new Set(latestSix.slice(0, 4).map((n) => `${n.kind}-${n.id}`));
  const boardNotes: StickyNote[] = latestSix.map((n) => ({
    ...n,
    narrowHidden: !narrowVisible.has(`${n.kind}-${n.id}`),
  }));
  // Fisher–Yates를 시드 기반으로 — 렌더 순수성을 지키면서(같은 날·같은 목록이면 같은 배치),
  // 날이 바뀌거나 새 문장이 들어오면 배치가 새로 섞인다.
  const seedStr = `${user.id}|${todayKst}|${latestSix.map((n) => n.id).join(',')}`;
  let seed = 0;
  for (const ch of seedStr) seed = (seed * 31 + ch.charCodeAt(0)) >>> 0;
  for (let i = boardNotes.length - 1; i > 0; i--) {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    const j = seed % (i + 1);
    [boardNotes[i], boardNotes[j]] = [boardNotes[j], boardNotes[i]];
  }

  return (
    <main className="w-full">
      <GreetingHeader name={profile?.name ?? null} />

      <AnimatedSection>
        {recap && <MonthlyRecapCard recap={recap} />}
        <Composer books={books ?? []} recentUserBookId={recentUserBookId} userId={user.id} />
        {recall && <RecallCard recall={recall} />}
        <WeeklyStreakSection
          weeklyCount={weeklyCount}
          weekActivity={weekActivity}
          todayKst={todayKst}
        />

        {books && books.length > 0 ? (
          <InProgressBooksStack
            myBooks={books}
            initialTopId={recentUserBookId ?? books[0].id}
            latestTexts={latestTexts}
          />
        ) : (
          <NoBooksSection />
        )}

        <QuoteBoard notes={boardNotes} />
        {stats && <ExLibrisPanel name={profile?.name ?? null} stats={stats} />}
      </AnimatedSection>
    </main>
  );
}
