export default function SectionCard({
  title,
  icon,
  children,
}: {
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl bg-white dark:bg-gray-800 p-5 shadow border border-gray-200 dark:border-gray-700 space-y-3">
      <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200 flex items-center gap-2">
        {icon} {title}
      </h2>
      {children}
    </section>
  );
}
