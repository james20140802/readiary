/** 덧붙인 생각의 날짜 — '2026. 9. 18.'(서울 시간) */
export const thoughtDate = (value: string) =>
  new Intl.DateTimeFormat('ko-KR', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
  }).format(new Date(value));
