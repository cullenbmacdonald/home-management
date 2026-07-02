import Link from "next/link";
import { asc, isNull } from "drizzle-orm";
import { db } from "@/db";
import { tasks, users } from "@/db/schema";
import { listMaintenanceWithDue } from "@/lib/maintenance";
import { getCurrentUser } from "@/lib/auth";
import { DueBadge } from "@/components/status-badge";
import { MarkDoneButton } from "@/components/mark-done-button";
import { TaskRow } from "@/components/task-row";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const user = await getCurrentUser();
  const maintenance = listMaintenanceWithDue();
  const needsAttention = maintenance.filter((m) => m.status !== "ok");

  const allUsers = db.select().from(users).all();
  const userMap = new Map(allUsers.map((u) => [u.id, u.displayName]));
  const openTasks = db
    .select()
    .from(tasks)
    .where(isNull(tasks.completedAt))
    .orderBy(asc(tasks.dueDate))
    .limit(5)
    .all();

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-serif text-[30px] leading-[1.1] text-[#1c1917]">
          {greeting}, {user?.displayName}
        </h1>
        <p className="text-sm text-[#a8a29e]">
          {new Date().toLocaleDateString("en-US", {
            weekday: "long",
            month: "long",
            day: "numeric",
          })}
        </p>
      </div>

      <section>
        <div className="mb-2 flex items-baseline justify-between">
          <h2 className="font-semibold">Upkeep needing attention</h2>
          <Link href="/maintenance" className="text-sm text-emerald-700">
            all →
          </Link>
        </div>
        {needsAttention.length === 0 ? (
          <div className="rounded-xl bg-white p-4 text-sm text-stone-500 shadow-sm">
            All caught up — nothing due in the next week. 🎉
          </div>
        ) : (
          <ul className="space-y-2">
            {needsAttention.map((item) => (
              <li
                key={item.id}
                className="flex items-center gap-3 rounded-xl bg-white p-4 shadow-sm"
              >
                <Link href={`/maintenance/${item.id}`} className="min-w-0 flex-1">
                  <div className="font-medium">{item.name}</div>
                  <div className="mt-1">
                    <DueBadge status={item.status} daysUntilDue={item.daysUntilDue} />
                  </div>
                </Link>
                <MarkDoneButton itemId={item.id} />
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <div className="mb-2 flex items-baseline justify-between">
          <h2 className="font-semibold">Open tasks</h2>
          <Link href="/tasks" className="text-sm text-emerald-700">
            all →
          </Link>
        </div>
        {openTasks.length === 0 ? (
          <div className="rounded-xl bg-white p-4 text-sm text-stone-500 shadow-sm">
            No open tasks.
          </div>
        ) : (
          <ul className="space-y-2">
            {openTasks.map((t) => (
              <TaskRow
                key={t.id}
                task={{
                  ...t,
                  assigneeName: t.assigneeId ? userMap.get(t.assigneeId) ?? null : null,
                }}
              />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
