import { EntryDetailData } from '@/types/entry';
import type { EntryFormValues } from '@/components/entries/EntryFormBody';

/**
 * 책 상세의 기록 목록을 그 자리에서 갱신하는 순수 함수들.
 * 바텀시트에서 고치거나 지운 결과를 서버 재조회(router.refresh) 전에 먼저 반영한다.
 */
export function patchEntryInList<T extends EntryDetailData[] | null>(
  list: T,
  entryId: string,
  values: EntryFormValues
): T {
  if (!list) return list;
  return list.map((item) =>
    item.entry.id === entryId ? { ...item, entry: { ...item.entry, ...values } } : item
  ) as T;
}

export function removeEntryFromList<T extends EntryDetailData[] | null>(
  list: T,
  entryId: string
): T {
  if (!list) return list;
  return list.filter((item) => item.entry.id !== entryId) as T;
}
