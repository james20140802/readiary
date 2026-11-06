import type { CommentTarget } from './target';

/**
 * 이 탭에서 내가 바꾼 좋아요·댓글 수를 기억한다.
 *
 * 뒤로 가기는 서버에 다시 묻지 않고 Next.js 라우터가 기억해 둔 화면 데이터를 꺼낸다. 그래서 발췌집에서
 * 좋아요를 누르고 피드로 돌아오면 피드는 누르기 전 값으로 다시 그려진다. 지금 값(after)과 함께 이 탭에서
 * 지나간 값들(stale)을 모두 적어 둔다. 화면이 받은 첫 값이 지나간 값 중 하나면 예전 데이터로 보고 after를 쓰고,
 * 처음 보는 값이면 그 뒤에 서버에서 새로 읽은 값이니 그대로 믿는다.
 * 지나간 값을 첫 값만 두지 않는 것은, 두 번 바꾸는 사이에 읽은 화면(중간 값)도 예전 데이터이기 때문이다.
 */
export interface LikeSnapshot {
  liked: boolean;
  likeCount: number;
}

interface Change<T> {
  stale: T[];
  after: T;
}

/** 한 대상에 기억하는 지나간 값의 수. 한 탭에서 이보다 많이 오가는 일은 드물다 */
const MAX_STALE = 8;

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
  const seen = prev ? [...prev.stale, prev.after, before] : [before];
  // 지금 값은 지나간 값이 아니다. 같은 값은 한 번만 둔다
  const stale = seen.filter(
    (value, i) => !same(value, after) && seen.findIndex((other) => same(other, value)) === i
  );
  map.set(key, { stale: stale.slice(-MAX_STALE), after });
}

function resolve<T>(
  map: Map<string, Change<T>>,
  key: string,
  initial: T,
  same: (a: T, b: T) => boolean
): T {
  const change = map.get(key);
  return change && change.stale.some((value) => same(value, initial)) ? change.after : initial;
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
