/**
 * 사진에서 고른 글을 넣은 뒤 문장 칸에 포커스를 두고 커서를 끝에 놓는다.
 * 고르는 화면(대화상자)이 닫히는 동안에는 바탕이 inert라 포커스가 걸리지 않고, 닫히면서 대화상자가
 * 포커스를 열었던 버튼으로 되돌린다. 그래서 바로 한 번, 닫힌 뒤에 다시 한 번 건다.
 */
export function focusAtEnd(field: HTMLTextAreaElement | null): void {
  if (!field) return;
  const run = () => {
    if (!field.isConnected) return;
    if (document.activeElement !== field) field.focus();
    const end = field.value.length;
    field.setSelectionRange(end, end);
    field.scrollTop = field.scrollHeight;
  };
  run();
  for (const delay of [0, 60, 250]) {
    setTimeout(() => {
      if (document.activeElement !== field) run();
    }, delay);
  }
}
