import type { CommentTarget } from './target';

/**
 * 이 탭에서 내가 바꾼 좋아요·댓글 수를 기억한다.
 *
 * 뒤로 가기는 서버에 다시 묻지 않고 Next.js 라우터가 기억해 둔 화면 데이터를 꺼낸다. 그래서 발췌집에서
 * 좋아요를 누르고 피드로 돌아오면 피드는 누르기 전 값으로 다시 그려진다. 바꾸기 전(before)과 후(after)를
 * 함께 적어 두고, 화면이 받은 첫 값이 before와 같으면 바꾸기 전에 읽은 데이터로 보고 after를 쓴다.
 * 다르면 그 뒤에 서버에서 새로 읽은 값이니 그대로 믿는다.
 */
export interface LikeSnapshot {
  liked: boolean;
  likeCount: number;
}

interface Change<T> {
  before: T;
  after: T;
}

const likes = new Map<string, Change<LikeSnapshot>>();
const commentCounts = new Map<string, Change<number>>();

export function reactionKey(target: CommentTarget | string): string {
  if (typeof target === 'string') return `entry:${target}`;
  return target.kind === 'entry'
    ? `entry:${target.entryId}`
    : `monthly_excerpt:${target.excerptId}`;
}

function remember<T>(
  map: Map<string, Change<T>>,
  key: string,
  before: T,
  after: T,
  same: (a: T, b: T) => boolean
) {
  const prev = map.get(key);
  // 이어서 바꾼 것이면 처음 상태를 그대로 둔다. 예전 화면은 처음 상태를 들고 있다
  map.set(key, { before: prev && same(prev.after, before) ? prev.before : before, after });
}

function resolve<T>(
  map: Map<string, Change<T>>,
  key: string,
  initial: T,
  same: (a: T, b: T) => boolean
): T {
  const change = map.get(key);
  return change && same(change.before, initial) ? change.after : initial;
}

const sameLike = (a: LikeSnapshot, b: LikeSnapshot) =>
  a.liked === b.liked && a.likeCount === b.likeCount;
const sameCount = (a: number, b: number) => a === b;

export function rememberLike(key: string, before: LikeSnapshot, after: LikeSnapshot) {
  remember(likes, key, before, after, sameLike);
}

export function resolveLike(key: string, initial: LikeSnapshot): LikeSnapshot {
  return resolve(likes, key, initial, sameLike);
}

export function rememberCommentCount(key: string, before: number, after: number) {
  if (before === after) return;
  remember(commentCounts, key, before, after, sameCount);
}

export function resolveCommentCount(key: string, initial: number): number {
  return resolve(commentCounts, key, initial, sameCount);
}

/** 테스트에서만 쓴다 */
export function resetReactionMemory() {
  likes.clear();
  commentCounts.clear();
}
