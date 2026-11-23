export interface KakaoBookSearchResponse {
  meta: {
    total_count: number; // 전체 검색 결과 수
    pageable_count: number; // 노출 가능 문서 수
    is_end: boolean; // 현재 페이지가 마지막 페이지인지 여부
  };
  documents: KakaoBookDocument[];
}

export interface KakaoBookDocument {
  authors: string[]; // 저자 목록
  contents: string; // 책 소개
  datetime: string; // 출판 일자 (ISO 8601)
  isbn: string; // ISBN (10자리 + 13자리 형식으로 '-' 없이 붙어있음)
  price: number; // 정가
  publisher: string; // 출판사
  sale_price: number; // 판매가
  status: '정상판매' | '절판' | '품절'; // 판매 상태
  thumbnail: string; // 표지 이미지 URL
  title: string; // 제목
  translators: string[]; // 번역자 목록
  url: string; // 책 정보 페이지 URL
}
