export function buildInviteSlug(nickname: string, tag: string | null): string {
  return `${nickname}-${tag || '0000'}`;
}

/** 기존 u/[nicknameAndTag] 라우트와 동일: decode 후 마지막 '-'에서 분할 (닉네임에 '-' 포함 가능) */
export function parseInviteSlug(slug: string): { nickname: string; tag: string } | null {
  let decoded: string;
  try {
    decoded = decodeURIComponent(slug);
  } catch {
    return null;
  }
  const separatorIndex = decoded.lastIndexOf('-');
  if (separatorIndex <= 0 || separatorIndex === decoded.length - 1) return null;
  return {
    nickname: decoded.slice(0, separatorIndex),
    tag: decoded.slice(separatorIndex + 1),
  };
}

export function slugToSearchQuery(slug: string): string | null {
  const parsed = parseInviteSlug(slug);
  return parsed ? `${parsed.nickname}#${parsed.tag}` : null;
}

/**
 * 친구 프로필 라우트(u/[nicknameAndTag]) 전용 진입점: '@' 접두어를 뗀 뒤
 * parseInviteSlug와 동일한 규칙(마지막 '-'에서 분할)으로 파싱한다.
 * 닉네임은 [a-zA-Z0-9_]만 허용되므로(lib/profile/nickname.ts) '%'가 섞일 수 없어,
 * 여기서 한 번 decode한 뒤 parseInviteSlug에서 다시 decode해도 결과가 달라지지 않는다.
 */
export function parseNicknameAndTagSlug(rawSlug: string): { nickname: string; tag: string } | null {
  let decoded: string;
  try {
    decoded = decodeURIComponent(rawSlug);
  } catch {
    return null;
  }
  const withoutAt = decoded.startsWith('@') ? decoded.slice(1) : decoded;
  return parseInviteSlug(withoutAt);
}
