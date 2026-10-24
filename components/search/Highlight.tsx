export default function Highlight({ text, query }: { text: string; query: string }) {
  const term = query.trim();
  if (!term) return <>{text}</>;
  // Escape regex syntax; React escapes all returned text, including user-written markup.
  const expression = new RegExp(`(${term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
  return (
    <>
      {text.split(expression).map((part, index) =>
        index % 2 ? (
          // 형광펜 밑줄 — 시안 search.html의 mark: 글자 아래 42%만 파란 잉크로 칠한다
          <mark
            key={index}
            className="bg-transparent bg-[linear-gradient(transparent_58%,rgb(var(--accent)/0.24)_58%)] text-inherit"
          >
            {part}
          </mark>
        ) : (
          part
        )
      )}
    </>
  );
}
