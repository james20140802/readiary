import Navbar from '@/components/Navbar';

export default function ProtectedLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col min-h-screen w-full">
      <main className="flex-1 pb-[64px] px-4 max-w-screen-md w-full mx-auto">{children}</main>
      <Navbar />
    </div>
  );
}
