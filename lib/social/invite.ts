export function buildInviteSlug(nickname: string, tag: string | null): string {
  return `${nickname}-${tag || '0000'}`;
}

/** 이미 decode된 문자열을 마지막 '-'에서 닉네임/태그로 나눈다 (규칙 도입 전 닉네임엔 '-'가 있을 수 있다) */
function splitNicknameAndTag(decoded: string): { nickname: string; tag: string } | null {
  const separatorIndex = decoded.lastIndexOf('-');
  if (separatorIndex <= 0 || separatorIndex === decoded.length - 1) return null;
  return {
    nickname: decoded.slice(0, separatorIndex),
    tag: decoded.slice(separatorIndex + 1),
  };
}

/** 기존 u/[nicknameAndTag] 라우트와 동일: decode 후 마지막 '-'에서 분할 (닉네임에 '-' 포함 가능) */
export function parseInviteSlug(slug: string): { nickname: string; tag: string } | null {
  let decoded: string;
  try {
    decoded = decodeURIComponent(slug);
  } catch {
    return null;
  }
  return splitNicknameAndTag(decoded);
}

export function slugToSearchQuery(slug: string): string | null {
  const parsed = parseInviteSlug(slug);
  return parsed ? `${parsed.nickname}#${parsed.tag}` : null;
}

/**
 * 친구 프로필 라우트(u/[nicknameAndTag]) 전용 진입점: 딱 한 번 decode하고 '@' 접두어를 뗀 뒤
 * parseInviteSlug와 같은 규칙(마지막 '-'에서 분할)으로 나눈다.
 * 규칙 도입 전 닉네임에는 '%' 같은 문자가 남아 있을 수 있어, 두 번 decode하면 그 링크가 깨진다.
 */
export function parseNicknameAndTagSlug(rawSlug: string): { nickname: string; tag: string } | null {
  let decoded: string;
  try {
    decoded = decodeURIComponent(rawSlug);
  } catch {
    return null;
  }
  const withoutAt = decoded.startsWith('@') ? decoded.slice(1) : decoded;
  return splitNicknameAndTag(withoutAt);
}
