/** 'reader@example.com' → 'read•••@example.com' — 화면 너머로 보일 수 있어 앞부분만 보인다 */
export function maskEmail(email: string | null | undefined): string | null {
  if (!email) return null;
  const at = email.lastIndexOf('@');
  if (at <= 0) return null;
  const local = email.slice(0, at);
  const keep = Math.min(4, Math.max(1, local.length - 2));
  return `${local.slice(0, keep)}•••${email.slice(at)}`;
}
