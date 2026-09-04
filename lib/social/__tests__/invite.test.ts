import { describe, expect, it } from 'vitest';
import {
  buildInviteSlug,
  parseInviteSlug,
  parseNicknameAndTagSlug,
  slugToSearchQuery,
} from '../invite';

describe('invite slug', () => {
  it('닉네임과 태그로 슬러그를 만든다', () => {
    expect(buildInviteSlug('책벌레', '1234')).toBe('책벌레-1234');
  });
  it('태그가 없으면 0000을 쓴다 (기존 ProfileHeader 관례)', () => {
    expect(buildInviteSlug('책벌레', null)).toBe('책벌레-0000');
  });
  it('마지막 하이픈에서 분할한다 (하이픈 포함 닉네임 보존)', () => {
    expect(parseInviteSlug('책벌레-1234')).toEqual({ nickname: '책벌레', tag: '1234' });
  });
  it('닉네임에 하이픈이 있어도 마지막 하이픈에서 분할한다', () => {
    expect(parseInviteSlug('anne-marie-1234')).toEqual({
      nickname: 'anne-marie',
      tag: '1234',
    });
    expect(slugToSearchQuery('anne-marie-1234')).toBe('anne-marie#1234');
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
  it('잘못된 URI 인코딩이어도 던지지 않고 null을 반환한다', () => {
    expect(parseInviteSlug('%')).toBeNull();
    expect(parseInviteSlug('%zz-1234')).toBeNull();
    expect(slugToSearchQuery('%')).toBeNull();
  });
});

describe('parseNicknameAndTagSlug (u/[nicknameAndTag] 라우트 공통 진입점)', () => {
  it('@ 접두어를 떼고 마지막 하이픈에서 분할한다', () => {
    expect(parseNicknameAndTagSlug('@book_worm-1234')).toEqual({
      nickname: 'book_worm',
      tag: '1234',
    });
  });
  it('@ 접두어가 없어도 동일하게 동작한다', () => {
    expect(parseNicknameAndTagSlug('book_worm-1234')).toEqual({
      nickname: 'book_worm',
      tag: '1234',
    });
  });
  it('URL 인코딩된 슬러그를 디코드한다', () => {
    expect(parseNicknameAndTagSlug(encodeURIComponent('@책벌레-1234'))).toEqual({
      nickname: '책벌레',
      tag: '1234',
    });
  });
  it('하이픈이 없으면 null', () => {
    expect(parseNicknameAndTagSlug('@book_worm')).toBeNull();
    expect(parseNicknameAndTagSlug('')).toBeNull();
  });
  it("한 번만 decode한다 — 규칙 도입 전 '%'가 든 닉네임 링크도 깨지지 않는다", () => {
    expect(parseNicknameAndTagSlug(encodeURIComponent('@foo%bar-1234'))).toEqual({
      nickname: 'foo%bar',
      tag: '1234',
    });
  });
  it('잘못된 URI 인코딩이어도 던지지 않고 null을 반환한다', () => {
    expect(parseNicknameAndTagSlug('%')).toBeNull();
  });
});
