import { asIsbn13 } from './isbn';

/**
 * 알라딘 Open API(상품 조회). 카카오가 모르는 ISBN을 찾거나, 다음 책 정보에서 쪽수를 읽지 못했을 때만 쓴다.
 * 키(ALADIN_TTB_KEY)는 서버에만 두고, 없으면 조용히 건너뛴다 — 알라딘 없이도 책 등록은 그대로 된다.
 * 보내는 것은 ISBN뿐이다. 이용 조건에 따라 알라딘에서 온 정보를 보여 줄 때는 출처를 적는다.
 */
const ENDPOINT = 'https://www.aladin.co.kr/ttb/api/ItemLookUp.aspx';
const TIMEOUT_MS = 5000;

export interface AladinBook {
  title: string;
  authors: string[];
  publisher: string;
  cover: string | null;
  isbn: string;
  pubDate: string | null;
  link: string;
  totalPages: number | null;
}

export function aladinKey(): string | null {
  const key = process.env.ALADIN_TTB_KEY?.trim();
  return key ? key : null;
}

/** '한강 (지은이), 홍길동 (옮긴이)'에서 지은이를 고른다. 역할이 적히지 않았으면 이름 그대로 둔다 */
export function aladinAuthors(raw: string | null | undefined): string[] {
  if (!raw) return [];
  const people = raw
    .split(',')
    .map((part) => {
      const m = part.trim().match(/^(.*?)\s*(?:\(([^)]*)\))?$/);
      return { name: (m?.[1] ?? '').trim(), role: (m?.[2] ?? '').trim() };
    })
    .filter((p) => p.name);
  const writers = people.filter((p) => !p.role || /지은이|글|저자|엮은이|편저/.test(p.role));
  return (writers.length > 0 ? writers : people).map((p) => p.name);
}

function httpsUrl(url: unknown): string | null {
  if (typeof url !== 'string' || !url) return null;
  return url.replace(/^http:\/\//, 'https://');
}

interface AladinItem {
  title?: string;
  author?: string;
  publisher?: string;
  cover?: string;
  isbn?: string;
  isbn13?: string;
  pubDate?: string;
  link?: string;
  subInfo?: { itemPage?: number | string };
}

export function toAladinBook(item: AladinItem): AladinBook | null {
  const title = item.title?.trim();
  const isbn = asIsbn13(item.isbn13 ?? '') ?? item.isbn?.trim();
  if (!title || !isbn) return null;
  const pages = Number(item.subInfo?.itemPage);
  return {
    title,
    authors: aladinAuthors(item.author),
    publisher: item.publisher?.trim() ?? '',
    cover: httpsUrl(item.cover),
    isbn,
    pubDate: item.pubDate?.trim() || null,
    link: httpsUrl(item.link) ?? 'https://www.aladin.co.kr',
    totalPages: Number.isInteger(pages) && pages > 0 ? pages : null,
  };
}

/** ISBN 하나로 알라딘 상품 정보를 찾는다. 없거나 실패하면 null — 호출자는 알라딘 없이 계속한다 */
export async function lookupAladin(isbn: string, key: string): Promise<AladinBook | null> {
  const params = new URLSearchParams({
    ttbkey: key,
    itemIdType: isbn.length === 13 ? 'ISBN13' : 'ISBN',
    ItemId: isbn,
    output: 'js',
    Version: '20131101',
    Cover: 'Big',
  });
  try {
    const res = await fetch(`${ENDPOINT}?${params}`, { signal: AbortSignal.timeout(TIMEOUT_MS) });
    if (!res.ok) return null;
    // 옛 응답은 끝에 세미콜론이 붙기도 한다
    const text = (await res.text()).trim().replace(/;\s*$/, '');
    const data = JSON.parse(text) as { item?: AladinItem[]; errorCode?: number };
    if (data.errorCode || !Array.isArray(data.item) || data.item.length === 0) return null;
    return toAladinBook(data.item[0]);
  } catch {
    return null;
  }
}
