/** 온보딩 프로필 insert 실패를 사용자 행동으로 이어지는 세 갈래로 분류한다. */
export type ProfileInsertErrorKind = 'profile_exists' | 'tag_conflict' | 'unknown';

/**
 * profiles insert의 유니크 제약은 pkey(id)와 (nickname, tag) 둘뿐이므로,
 * 검증된 이름(profiles_pkey)이 아닌 23505는 태그 충돌로 간주한다 —
 * 두 번째 제약의 실제 이름에 의존하지 않기 위한 선택(재시도는 5회 상한이라 안전).
 */
export function classifyProfileInsertError(
  error: { code?: string; message?: string } | null | undefined
): ProfileInsertErrorKind {
  if (error?.code !== '23505') return 'unknown';
  if ((error.message ?? '').includes('profiles_pkey')) return 'profile_exists';
  return 'tag_conflict';
}
