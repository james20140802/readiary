import { describe, expect, it } from 'vitest';
import {
  commentPayload,
  commentScope,
  commentsListUrl,
  commentsUrl,
  likePayload,
  likersUrl,
  likesUrl,
  type CommentTarget,
} from '../target';

const entry: CommentTarget = { kind: 'entry', entryId: 'e1' };
const excerpt: CommentTarget = { kind: 'monthly_excerpt', excerptId: 'x1' };

describe('CommentTarget 주소', () => {
  it('기록의 주소는 예전과 같다', () => {
    expect(commentsUrl(entry)).toBe('/api/comments');
    expect(commentsUrl(entry, { id: 'c1' })).toBe('/api/comments?id=c1');
    expect(commentsListUrl(entry)).toBe('/api/comments?entry_id=e1');
    expect(likesUrl(entry)).toBe('/api/likes');
    expect(likersUrl(entry)).toBe('/api/likes?entry_id=e1');
  });

  it('달의 발췌집은 권 아래 경로를 쓴다', () => {
    expect(commentsUrl(excerpt)).toBe('/api/monthly-excerpts/x1/comments');
    expect(commentsUrl(excerpt, { id: 'c1' })).toBe('/api/monthly-excerpts/x1/comments?id=c1');
    expect(commentsListUrl(excerpt)).toBe('/api/monthly-excerpts/x1/comments');
    expect(likesUrl(excerpt)).toBe('/api/monthly-excerpts/x1/likes');
    expect(likersUrl(excerpt)).toBe('/api/monthly-excerpts/x1/likes');
  });

  it('요청 본문: 기록은 entryId를 그대로 보내고, 권은 경로에 있으니 보내지 않는다', () => {
    expect(commentPayload(entry, '좋다', null)).toEqual({
      entryId: 'e1',
      content: '좋다',
      parentId: null,
    });
    expect(commentPayload(excerpt, '좋다', 'p1')).toEqual({ content: '좋다', parentId: 'p1' });
    expect(likePayload(entry)).toEqual({ entryId: 'e1' });
    expect(likePayload(excerpt)).toEqual({});
  });

  it('임시 보관 범위: 기록은 예전 값 그대로라 보관된 제출을 잃지 않고, 권은 겹치지 않는다', () => {
    expect(commentScope(entry)).toBe('comment:e1');
    expect(commentScope(excerpt)).toBe('comment:monthly_excerpt:x1');
  });
});
