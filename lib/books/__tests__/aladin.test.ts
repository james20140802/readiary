import { afterEach, describe, expect, it, vi } from 'vitest';
import { aladinAuthors, lookupAladin, toAladinBook } from '../aladin';

afterEach(() => vi.unstubAllGlobals());

describe('알라딘 상품 조회', () => {
  it('지은이만 고르고 옮긴이는 뺀다', () => {
    expect(aladinAuthors('한강 (지은이)')).toEqual(['한강']);
    expect(aladinAuthors('조지 오웰 (지은이), 정회성 (옮긴이)')).toEqual(['조지 오웰']);
    expect(aladinAuthors('정회성 (옮긴이)')).toEqual(['정회성']);
    expect(aladinAuthors('')).toEqual([]);
  });

  it('쪽수·https 표지를 정리한다', () => {
    expect(
      toAladinBook({
        title: '소년이 온다',
        author: '한강 (지은이)',
        publisher: '창비',
        cover: 'http://image.aladin.co.kr/product/1/cover500/x.jpg',
        isbn13: '9788936434267',
        pubDate: '2014-05-19',
        link: 'http://www.aladin.co.kr/shop/wproduct.aspx?ItemId=1',
        subInfo: { itemPage: 216 },
      })
    ).toEqual({
      title: '소년이 온다',
      authors: ['한강'],
      publisher: '창비',
      cover: 'https://image.aladin.co.kr/product/1/cover500/x.jpg',
      isbn: '9788936434267',
      pubDate: '2014-05-19',
      link: 'https://www.aladin.co.kr/shop/wproduct.aspx?ItemId=1',
      totalPages: 216,
    });
    expect(
      toAladinBook({ title: 't', isbn13: '9788936434267', subInfo: {} })?.totalPages
    ).toBeNull();
  });

  it('ISBN13으로 묻고, 끝의 세미콜론이 붙은 응답도 읽는다', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          item: [{ title: 't', isbn13: '9788936434267', subInfo: { itemPage: 10 } }],
        }) + ';'
      )
    );
    vi.stubGlobal('fetch', fetchMock);
    expect((await lookupAladin('9788936434267', 'KEY'))?.totalPages).toBe(10);
    const called = new URL(fetchMock.mock.calls[0][0]);
    expect(called.searchParams.get('itemIdType')).toBe('ISBN13');
    expect(called.searchParams.get('ItemId')).toBe('9788936434267');
  });

  it('오류 응답·네트워크 실패는 null', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response(JSON.stringify({ errorCode: 8, errorMessage: 'x' })))
    );
    expect(await lookupAladin('9788936434267', 'KEY')).toBeNull();
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('down')));
    expect(await lookupAladin('9788936434267', 'KEY')).toBeNull();
  });
});
