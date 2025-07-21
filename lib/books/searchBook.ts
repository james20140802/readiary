import { KakaoBookSearchResponse } from '@/types/kakao';

export async function searchBook(query: string) {
  const res = await fetch(`/api/books/search?q=${encodeURIComponent(query)}`);

  if (!res.ok) {
    throw new Error(`검색 실패: ${res.status}`);
  }

  const data: KakaoBookSearchResponse = await res.json();

  // Kakao 응답 포맷 맞춰서 정리
  return data.documents.map((doc) => ({
    title: doc.title,
    authors: doc.authors,
    publisher: doc.publisher,
    thumbnail: doc.thumbnail,
    isbn: doc.isbn,
    contents: doc.contents,
    datetime: doc.datetime,
    url: doc.url,
  }));
}
