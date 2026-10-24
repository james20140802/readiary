-- 책 표지를 카카오 검색 썸네일(120×174)에서 그 안에 든 다음 책 이미지 원본(가로 약 450px)으로 바꾼다.
-- 썸네일 주소의 fname이 t1.daumcdn.net/lbook/image/<번호>[?timestamp=<숫자>]일 때만 바꾸고, 다른 주소는 두지 않는다.
-- 되돌리기: 원본 주소를 'https://search1.kakaocdn.net/thumb/R120x174.q85/?fname=' || (http 원본을 URL 인코딩한 값)으로 감싸면 예전 값이 된다.
-- 새로 등록하는 책은 앱(lib/books/coverUrl.ts)이 같은 규칙으로 원본을 저장한다.
update public.books
set cover_url = 'https://t1.daumcdn.net/lbook/image/'
  || (regexp_match(cover_url, 'lbook%2Fimage%2F([0-9]+)'))[1]
  || coalesce('?timestamp=' || (regexp_match(cover_url, '%3Ftimestamp%3D([0-9]+)$'))[1], '')
where cover_url ~ '^https://search1\.kakaocdn\.net/thumb/R120x174\.q85/\?fname=http%3A%2F%2Ft1\.daumcdn\.net%2Flbook%2Fimage%2F[0-9]+(%3Ftimestamp%3D[0-9]+)?$';
