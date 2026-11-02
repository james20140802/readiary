export type ExportAction = 'share' | 'copy' | 'download';

/**
 * 기기에 맞는 버튼 — 휴대폰·태블릿은 공유 시트(파일 저장도 그 안에서)와 복사,
 * 컴퓨터는 복사와 .md 저장. 맥 Safari처럼 컴퓨터에서 공유를 지원해도 숨긴다.
 */
export function exportActions(env: {
  canShare: boolean;
  coarsePointer: boolean;
}): readonly ['share', 'copy'] | readonly ['copy', 'download'] {
  return env.canShare && env.coarsePointer ? ['share', 'copy'] : ['copy', 'download'];
}
