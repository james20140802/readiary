import Navbar from '@/components/Navbar';

export default function ProtectedLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <main className="flex-1 max-w-screen-md w-full mx-auto px-4 pt-4 md:pt-[56px] pb-20 md:pb-[64px]">
        {children}
      </main>
    </div>
  );
}
