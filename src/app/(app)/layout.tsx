import { requireUser } from "@/lib/auth";
import { AppHeader } from "@/components/app-header";
import { BottomNav } from "@/components/bottom-nav";
import { SideRail } from "@/components/side-rail";
import { PageTransition } from "@/components/page-transition";
import { runDueSweepIfDue, unreadCount } from "@/lib/notifications";

export default async function AppLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const user = await requireUser();
  // First request of the day generates due-soon/overdue notifications.
  await runDueSweepIfDue(user.householdId);
  const unread = await unreadCount(user.householdId);
  const chromeUser = {
    displayName: user.displayName,
    accentColor: user.accentColor,
  };
  return (
    <div className="mx-auto flex h-dvh w-full max-w-[430px] overflow-hidden bg-[#faf9f8] shadow-[0_0_60px_rgba(0,0,0,0.08)] md:max-w-[840px] xl:max-w-[1360px]">
      <SideRail user={chromeUser} />
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <AppHeader user={chromeUser} unreadCount={unread} />
        <main className="flex-1 overflow-y-auto overflow-x-hidden px-4 pb-[110px] pt-[18px] md:px-6 xl:pb-8">
          <PageTransition>{children}</PageTransition>
        </main>
      </div>
      <BottomNav />
    </div>
  );
}
