interface Props {
  name: string | null;
}

export default async function GreetingHeader({ name }: Props) {
  return (
    <h1 className="text-page-title text-label dark:text-white mb-4" aria-label="인사말">
      👋 반가워요! <span className="font-bold">{name ?? '사용자'}</span>님
    </h1>
  );
}
