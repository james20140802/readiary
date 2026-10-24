import { apiFetch } from '@/lib/api/fetch';
import { KakaoBookSearchResponse } from '@/types/kakao';
import { originalCoverUrl } from './coverUrl';

export async function searchBook(query: string) {
  const res = await apiFetch(`/api/books/search?q=${encodeURIComponent(query)}`);

  if (!res.ok) {
    throw new Error(`검색 실패: ${res.status}`);
  }

  const data: KakaoBookSearchResponse = await res.json();

  // Kakao 응답 포맷 맞춰서 정리
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
  }));
}
