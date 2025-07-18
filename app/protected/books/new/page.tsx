import NewBookForm from './_components/NewBookForm';

export default function NewBookPage() {
  return (
    <div className="w-full max-w-xl mx-auto p-4">
      <h1 className="text-xl font-semibold text-center text-gray-900 dark:text-white mb-4">
        책 등록
      </h1>
      <NewBookForm />
    </div>
  );
}
