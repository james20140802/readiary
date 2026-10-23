'use client';

import { useTopBar, type TopBarConfig } from '@/components/shell/TopBarContext';

/** 서버 화면이 모바일 상단 바의 제목·뒤로 가기를 정할 때 쓰는 빈 부품 */
export default function SocialTopBar(props: TopBarConfig) {
  useTopBar(props);
  return null;
}
