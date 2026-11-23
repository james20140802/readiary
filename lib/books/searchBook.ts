import { apiFetch } from '@/lib/api/fetch';
import type { BookSearchResponse } from '@/types/kakao';
import { originalCoverUrl } from './coverUrl';

export async function searchBook(query: string) {
  const res = await apiFetch(`/api/books/search?q=${encodeURIComponent(query)}`);

  if (!res.ok) {
    throw new Error(`검색 실패: ${res.status}`);
  }

  const data: BookSearchResponse = await res.json();

  // 카카오(또는 알라딘에서 옮긴) 문서를 화면용으로 정리
  return data.documents.map((doc) => ({
    title: doc.title,
    authors: doc.authors,
    publisher: doc.publisher,
    // 고를 때부터 원본 표지를 보여 준다(썸네일은 120px이라 흐리다)
    thumbnail: originalCoverUrl(doc.thumbnail),
    isbn: doc.isbn,
    contents: doc.contents,
    datetime: doc.datetime,
    url: doc.url,
    totalPages: doc.total_pages ?? undefined,
    source: doc.source,
  }));
}
