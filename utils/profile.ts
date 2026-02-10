// 유틸리티 함수 예시
export const getImageUrl = (path: string | null) => {
  if (!path) return null;
  // 외부 URL인 경우 그대로 반환, 경로만 있는 경우 환경 변수와 조합
  if (path.startsWith('http')) return path;
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL!}${process.env.NEXT_PUBLIC_PROFILE_IMAGE_URL!}${path}`;
};
