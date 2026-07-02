import { requireUser } from "@/lib/auth";
import { AppHeader } from "@/components/app-header";
import { BottomNav } from "@/components/bottom-nav";

export default async function AppLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const user = await requireUser();
  return (
    <div className="mx-auto flex h-dvh w-full max-w-[430px] flex-col overflow-hidden bg-[#faf9f8] shadow-[0_0_60px_rgba(0,0,0,0.08)]">
      <AppHeader
        user={{ displayName: user.displayName, accentColor: user.accentColor }}
      />
      <main className="flex-1 overflow-y-auto overflow-x-hidden px-4 pb-[90px] pt-[18px]">
        {children}
      </main>
      <BottomNav />
    </div>
  );
}
