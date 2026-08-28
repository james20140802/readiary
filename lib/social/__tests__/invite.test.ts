import { describe, expect, it } from 'vitest';
import { buildInviteSlug, parseInviteSlug, slugToSearchQuery } from '../invite';

describe('invite slug', () => {
  it('닉네임과 태그로 슬러그를 만든다', () => {
    expect(buildInviteSlug('책벌레', '1234')).toBe('책벌레-1234');
  });
  it('태그가 없으면 0000을 쓴다 (기존 ProfileHeader 관례)', () => {
    expect(buildInviteSlug('책벌레', null)).toBe('책벌레-0000');
  });
  it('첫 번째 하이픈에서 분할한다 (기존 u/[nicknameAndTag] 관례)', () => {
    expect(parseInviteSlug('책벌레-1234')).toEqual({ nickname: '책벌레', tag: '1234' });
  });
  it('URL 인코딩된 슬러그를 디코드한다', () => {
    expect(parseInviteSlug(encodeURIComponent('책벌레-1234'))).toEqual({
      nickname: '책벌레',
      tag: '1234',
    });
  });
  it('하이픈이 없으면 null', () => {
    expect(parseInviteSlug('책벌레')).toBeNull();
    expect(parseInviteSlug('')).toBeNull();
  });
  it('검색 쿼리 형식으로 변환한다', () => {
    expect(slugToSearchQuery('책벌레-1234')).toBe('책벌레#1234');
    expect(slugToSearchQuery('잘못된슬러그')).toBeNull();
  });
});
