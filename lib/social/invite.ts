export function buildInviteSlug(nickname: string, tag: string | null): string {
  return `${nickname}-${tag || '0000'}`;
}

/** 기존 u/[nicknameAndTag] 라우트와 동일: decode 후 첫 '-'에서 분할 */
export function parseInviteSlug(slug: string): { nickname: string; tag: string } | null {
  let decoded: string;
  try {
    decoded = decodeURIComponent(slug);
  } catch {
    return null;
  }
  const separatorIndex = decoded.indexOf('-');
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
