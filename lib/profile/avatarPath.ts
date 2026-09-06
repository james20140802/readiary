/** Storage 경로만 허용한다. 외부 URL, 경로 순회, 다른 버킷은 인증 프록시에 전달하지 않는다. */
export function isAvatarPath(path: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\/[a-z0-9_-]+\.(jpe?g|png|webp)$/i.test(
    path
  );
}
