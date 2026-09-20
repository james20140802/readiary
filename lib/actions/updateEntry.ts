import { apiFetch, SessionExpiredError } from '@/lib/api/fetch';
import { createSupabaseClient } from '@/lib/supabase/client';
import type { EntryFormValues } from '@/components/entries/EntryFormBody';

export class UncertainMutationError extends Error {
  constructor() {
    super('저장 결과를 확인하지 못했어요. 새로고침해 현재 기록을 확인해 주세요.');
  }
}
/** A lost PATCH response is not proof of failure. Reconcile before allowing another edit. */
export async function updateEntry(
  entryId: string,
  values: EntryFormValues
): Promise<string | null> {
  try {
    const response = await apiFetch(`/api/entries/${entryId}/edit`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(values),
    });
    if (response.ok) return null;
    if (response.status < 500) {
      const data = await response.json().catch(() => null);
      return data?.error ?? '입력을 확인해 주세요.';
    }
  } catch (error) {
    if (error instanceof SessionExpiredError) throw error;
  }
  try {
    const supabase = createSupabaseClient();
    const { data, error } = await supabase
      .from('entries')
      .select('quote,note,from_page,to_page,date,is_private,user_books!inner(book_id,user_id)')
      .eq('id', entryId)
      .single();
    const expected = {
      ...values,
      from_page: values.from_page ?? values.to_page,
      to_page: values.to_page ?? values.from_page,
    };
    if (
      !error &&
      data &&
      Object.entries(expected).every(([key, value]) => data[key as keyof typeof data] === value)
    ) {
      // The entry may have committed before the route's progress calculation failed.
      // Recalculate from current records without replaying or overwriting the edit.
      const book = Array.isArray(data.user_books) ? data.user_books[0] : data.user_books;
      if (!book?.book_id || !book?.user_id) throw new UncertainMutationError();
      const { error: progressError } = await supabase.rpc('update_user_book_progress', {
        p_book_id: book.book_id,
        p_user_id: book.user_id,
      });
      if (progressError) throw progressError;
      return null;
    }
  } catch {
    /* Preserve the unknown outcome. */
  }
  throw new UncertainMutationError();
}
