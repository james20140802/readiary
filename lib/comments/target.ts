/** 좋아요와 댓글이 붙는 곳: 기록 한 건 또는 달의 발췌집 한 권 */
export type CommentTarget =
  | { kind: 'entry'; entryId: string }
  | { kind: 'monthly_excerpt'; excerptId: string };

function withQuery(base: string, query?: Record<string, string>) {
  const search = new URLSearchParams(query).toString();
  return search ? `${base}?${search}` : base;
}

/** 댓글 API 주소. 쿼리를 함께 넘기면 그대로 붙인다(지우기는 `{ id }`) */
export function commentsUrl(target: CommentTarget, query?: Record<string, string>): string {
  const base =
    target.kind === 'entry'
      ? '/api/comments'
      : `/api/monthly-excerpts/${target.excerptId}/comments`;
  return withQuery(base, query);
}

/** 댓글 목록을 읽는 주소 */
export function commentsListUrl(target: CommentTarget): string {
  return target.kind === 'entry'
    ? commentsUrl(target, { entry_id: target.entryId })
    : commentsUrl(target);
}

/** 댓글 작성 본문. 권은 경로에 있어 본문으로 보내지 않는다 */
export function commentPayload(target: CommentTarget, content: string, parentId: string | null) {
  return target.kind === 'entry'
    ? { entryId: target.entryId, content, parentId }
    : { content, parentId };
}

/** 작성 재시도를 보관하는 범위. 기록은 예전 값 그대로라 이미 보관된 제출을 잃지 않는다 */
export function commentScope(target: CommentTarget): string {
  return target.kind === 'entry'
    ? `comment:${target.entryId}`
    : `comment:monthly_excerpt:${target.excerptId}`;
}

/** 좋아요를 토글하는 주소 */
export function likesUrl(target: CommentTarget): string {
  return target.kind === 'entry' ? '/api/likes' : `/api/monthly-excerpts/${target.excerptId}/likes`;
}

/** 좋아요 토글 본문 */
export function likePayload(target: CommentTarget): Record<string, string> {
  return target.kind === 'entry' ? { entryId: target.entryId } : {};
}

/** 좋아한 사람 명단을 읽는 주소 */
export function likersUrl(target: CommentTarget): string {
  return target.kind === 'entry'
    ? withQuery('/api/likes', { entry_id: target.entryId })
    : likesUrl(target);
}
