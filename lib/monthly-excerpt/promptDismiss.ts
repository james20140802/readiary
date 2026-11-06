import type { MonthKey } from './types';

/** 달마다 하나 — '다음에'를 누른 달에는 이 기기에서 다시 뜨지 않는다 */
export function promptStorageKey(month: MonthKey): string {
  return `readiary:month-prompt:${month}`;
}

export function isPromptDismissed(month: MonthKey): boolean {
  try {
    return window.localStorage.getItem(promptStorageKey(month)) === '1';
  } catch {
    return false;
  }
}

export function dismissPrompt(month: MonthKey): void {
  try {
    window.localStorage.setItem(promptStorageKey(month), '1');
  } catch {
    // 저장하지 못하면 다음에 다시 보일 뿐이다
  }
}
