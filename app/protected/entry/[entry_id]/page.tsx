import { getServerUser } from '@/lib/supabase/getServerUser';
import EntryDetailContent from '@/components/entry/EntryDetailContent';
import BackButton from '@/components/ui/BackButton';
import { fetchEntryDetail } from '@/lib/entries/fetchEntryDetail';
import { notFound } from 'next/navigation';

export default async function EntryDetailPage({
  params,
}: {
  params: Promise<{ entry_id: string }>;
}) {
  const {
    data: { user },
  } = await getServerUser();

  if (!user) return null;

  const entryId = (await params).entry_id;
  if (!entryId) return notFound();

  const detail = await fetchEntryDetail(entryId);

  if (!detail) {
    return notFound();
  }

  return (
    <>
      <header className="flex items-center mb-6">
        <BackButton />
      </header>

      <EntryDetailContent
        entry={detail.entry}
        book={detail.entry.book}
        initialLiked={detail.initialLiked}
        initialLikeCount={detail.initialLikeCount}
        initialCommentCount={detail.initialCommentCount}
        currentUserId={user.id}
      />
    </>
  );
}
