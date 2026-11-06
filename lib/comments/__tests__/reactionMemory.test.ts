import { beforeEach, describe, expect, it } from 'vitest';
import {
  reactionKey,
  rememberCommentCount,
  rememberLike,
  resetReactionMemory,
  resolveCommentCount,
  resolveLike,
} from '../reactionMemory';

beforeEach(resetReactionMemory);

describe('reactionKey', () => {
  it('기록과 발췌집은 id가 같아도 섞이지 않는다', () => {
    expect(reactionKey('a')).toBe('entry:a');
    expect(reactionKey({ kind: 'entry', entryId: 'a' })).toBe('entry:a');
    expect(reactionKey({ kind: 'monthly_excerpt', excerptId: 'a' })).toBe('monthly_excerpt:a');
  });
});

describe('좋아요', () => {
  const off = { liked: false, likeCount: 2 };
  const on = { liked: true, likeCount: 3 };

  it('기억이 없으면 받은 값 그대로', () => {
    expect(resolveLike('k', off)).toEqual(off);
  });

  it('바꾸기 전 값이 오면 바꾼 값을 준다', () => {
    rememberLike('k', off, on);
    expect(resolveLike('k', off)).toEqual(on);
  });

  it('다른 값이 오면 새로 읽은 것이라 그대로 믿는다', () => {
    rememberLike('k', off, on);
    const fresh = { liked: true, likeCount: 5 };
    expect(resolveLike('k', fresh)).toEqual(fresh);
  });

  it('이어서 바꾸면 처음 상태를 기준으로 남긴다', () => {
    rememberLike('k', off, on);
    rememberLike('k', on, off);
    expect(resolveLike('k', off)).toEqual(off);
    expect(resolveLike('k', on)).toEqual(on);
  });
});

describe('댓글 수', () => {
  it('바꾸기 전 수가 오면 바뀐 수를 준다', () => {
    rememberCommentCount('k', 1, 2);
    expect(resolveCommentCount('k', 1)).toBe(2);
    expect(resolveCommentCount('k', 4)).toBe(4);
  });

  it('같은 수는 기억하지 않는다', () => {
    rememberCommentCount('k', 1, 1);
    rememberCommentCount('k', 1, 2);
    rememberCommentCount('k', 2, 2);
    expect(resolveCommentCount('k', 1)).toBe(2);
  });
});
