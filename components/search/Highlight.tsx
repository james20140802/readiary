export default function Highlight({ text, query }: { text: string; query: string }) {
  const term = query.trim();
  if (!term) return <>{text}</>;
  // Escape regex syntax; React escapes all returned text, including user-written markup.
  const expression = new RegExp(`(${term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
  return (
    <>
      {text.split(expression).map((part, index) =>
        index % 2 ? (
          <mark
            key={index}
            className="bg-accent-soft text-ink underline decoration-accent underline-offset-4"
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
