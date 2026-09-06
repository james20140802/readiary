import { QuoteBoard, type StickyNote } from './QuoteBoard';
import { RecallCard } from './RecallCard';
import { MonthlyRecapCard } from './MonthlyRecapCard';
import { ExLibrisPanel } from './ExLibrisPanel';
import type { RecallEntry } from '@/lib/recall/fetchRecallEntry';
import type { MonthlyRecap } from '@/lib/retrospect/fetchMonthlyRecap';
import type { RecentEntry } from '@/lib/dashboard/fetchRecentEntries';
import type { DetailSocialFeedEntry } from '@/types/entry';
import type { Stats } from '@/types/profile';

export async function RecallWidget({ result }: { result: Promise<RecallEntry | null> }) {
  const recall = await result;
  return recall ? <RecallCard recall={recall} /> : null;
}
export async function RecapWidget({ result }: { result: Promise<MonthlyRecap | null> }) {
  const recap = await result;
  return recap ? <MonthlyRecapCard recap={recap} /> : null;
}
export async function StatsWidget({
  result,
  name,
}: {
  result: Promise<Stats | null>;
  name: string | null;
}) {
  const stats = await result;
  return stats ? (
    <ExLibrisPanel name={name} stats={stats} />
  ) : (
    <p className="text-caption text-ink-faint">독서 통계를 불러오지 못했습니다.</p>
  );
}
export async function BoardWidget({
  result,
  recentEntries,
  userId,
  todayKst,
}: {
  result: Promise<DetailSocialFeedEntry[] | null>;
  recentEntries: RecentEntry[];
  userId: string;
  todayKst: string;
}) {
  const friends = await result;
  const friendFeed = friends ?? [];
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
  const seedStr = `${userId}|${todayKst}|${latestSix.map((n) => n.id).join(',')}`;
  let seed = 0;
  for (const ch of seedStr) seed = (seed * 31 + ch.charCodeAt(0)) >>> 0;
  for (let i = boardNotes.length - 1; i > 0; i--) {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    const j = seed % (i + 1);
    [boardNotes[i], boardNotes[j]] = [boardNotes[j], boardNotes[i]];
  }

  return (
    <div>
      {friends === null && (
        <p className="mb-3 text-caption text-ink-faint">친구들의 문장을 불러오지 못했습니다.</p>
      )}
      <QuoteBoard notes={boardNotes} />
    </div>
  );
}
