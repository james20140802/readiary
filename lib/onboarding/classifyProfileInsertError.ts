/** 온보딩 프로필 insert 실패를 사용자 행동으로 이어지는 세 갈래로 분류한다. */
export type ProfileInsertErrorKind = 'profile_exists' | 'tag_conflict' | 'unknown';

export function classifyProfileInsertError(
  error: { code?: string; message?: string } | null | undefined
): ProfileInsertErrorKind {
  if (error?.code !== '23505') return 'unknown';
  const message = error.message ?? '';
  if (message.includes('profiles_pkey')) return 'profile_exists';
  if (message.includes('profiles_nickname_tag_key')) return 'tag_conflict';
  return 'unknown';
}
