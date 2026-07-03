import Link from "next/link";
import { db } from "@/db";
import { groceryItems } from "@/db/schema";
import { listMaintenanceWithDue } from "@/lib/maintenance";
import { buildEventsByDate, type EventType } from "@/lib/plan-data";
import { intervalLabel } from "@/lib/format";
import { toYMD } from "@/lib/week";
import { getCurrentUser } from "@/lib/auth";
import { DueBadge } from "@/components/status-badge";
import { MarkDoneButton } from "@/components/mark-done-button";
import { HomeTiles } from "@/components/home-tiles";

export const dynamic = "force-dynamic";

const TYPE_COLOR: Record<EventType, string> = {
  date: "#059669",
  event: "#0ea5e9",
  chore: "#a8a29e",
  upkeep: "#d97706",
};

const labelCls =
  "text-[12px] font-bold uppercase tracking-[0.06em] text-[#a8a29e]";

export default async function DashboardPage() {
  const user = await getCurrentUser();

  const maintenance = listMaintenanceWithDue();
  const needsAttention = maintenance.filter((m) => m.status !== "ok");

  const todayKey = toYMD(new Date());
  const todayEvents = buildEventsByDate([todayKey], todayKey)[todayKey];

  const groceries = db.select().from(groceryItems).all();
  const groceryTotal = groceries.length;
  const groceryChecked = groceries.filter((g) => g.checked).length;
  const groceryPct = groceryTotal ? (groceryChecked / groceryTotal) * 100 : 0;

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  return (
    <div>
      <div className="mb-[18px]">
        <h1 className="font-serif text-[30px] leading-[1.1] text-[#1c1917]">
          {greeting}, {user?.displayName}
        </h1>
        <p className="text-[13px] text-[#a8a29e]">
          {new Date().toLocaleDateString("en-US", {
            weekday: "long",
            month: "long",
            day: "numeric",
          })}
        </p>
      </div>

      {/* Needs attention */}
      <section>
        <div className="mx-1 mb-[9px] flex items-baseline justify-between">
          <h2 className={labelCls}>Needs attention</h2>
          <Link href="/maintenance" className="text-[12px] font-semibold text-[#059669]">
            all →
          </Link>
        </div>
        {needsAttention.length === 0 ? (
          <div className="flex items-center gap-3 rounded-[14px] border border-[#efece9] bg-white p-4">
            <span className="flex h-8 w-8 flex-none items-center justify-center rounded-full bg-[#ecfdf5] text-[15px] font-bold text-[#059669]">
              ✓
            </span>
            <div>
              <div className="text-[15px] font-semibold text-[#1c1917]">All caught up</div>
              <div className="text-[12px] text-[#a8a29e]">Nothing due in the next week.</div>
            </div>
          </div>
        ) : (
          <ul className="space-y-[9px]">
            {needsAttention.map((item) => (
              <li
                key={item.id}
                data-status={item.status}
                className="flex items-center gap-3 rounded-[14px] border border-[#efece9] bg-white p-[13px_14px]"
                style={{
                  borderLeft: `3px solid ${
                    item.status === "overdue" ? "#dc2626" : "#d97706"
                  }`,
                }}
              >
                <div className="min-w-0 flex-1">
                  <div className="text-[15px] font-semibold text-[#1c1917]">{item.name}</div>
                  <div className="mt-[3px] flex items-center gap-[7px]">
                    <DueBadge status={item.status} daysUntilDue={item.daysUntilDue} />
                    <span className="text-[11px] text-[#a8a29e]">
                      {intervalLabel(item.intervalDays)}
                    </span>
                  </div>
                </div>
                <MarkDoneButton itemId={item.id} />
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Today */}
      <section className="mt-[22px]">
        <div className="mx-1 mb-[9px] flex items-baseline justify-between">
          <h2 className={labelCls}>Today</h2>
          <Link href="/plan" className="text-[12px] font-semibold text-[#059669]">
            all →
          </Link>
        </div>
        <div className="rounded-[16px] border border-[#efece9] bg-white px-[14px] py-[6px]">
          {todayEvents.length === 0 ? (
            <div className="py-4 text-center text-[13px] text-[#a8a29e]">
              Nothing scheduled.
            </div>
          ) : (
            todayEvents.map((ev, i) => (
              <div
                key={ev.id ?? `up-${i}`}
                className="flex items-center gap-3 py-[11px]"
                style={{
                  borderBottom: i < todayEvents.length - 1 ? "1px solid #f0ede9" : "none",
                }}
              >
                <div className="w-[52px] flex-none text-[12px] font-semibold text-[#78716c]">
                  {ev.timeLabel}
                </div>
                <div
                  className="w-[3px] flex-none self-stretch rounded-[2px]"
                  style={{ background: TYPE_COLOR[ev.type] }}
                />
                <div className="min-w-0 flex-1">
                  <div className="text-[14px] text-[#1c1917]">{ev.title}</div>
                  {ev.who && (
                    <div className="mt-px text-[11px] text-[#a8a29e]">· {ev.who}</div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      {/* Groceries progress */}
      <section className="mt-[22px]">
        <h2 className={`mx-1 mb-[9px] ${labelCls}`}>Groceries</h2>
        <Link
          href="/groceries"
          className="block rounded-[16px] border border-[#efece9] bg-white p-[15px]"
        >
          <div className="mb-[10px] flex items-baseline justify-between">
            <span className="text-[14px] font-semibold text-[#1c1917]">
              {groceryTotal === 0
                ? "List is empty"
                : `${groceryChecked} of ${groceryTotal} in cart`}
            </span>
            {groceryTotal > 0 && (
              <span className="text-[12px] text-[#a8a29e]">
                {groceryTotal - groceryChecked} left
              </span>
            )}
          </div>
          <div className="h-2 overflow-hidden rounded-[5px] bg-[#f0ede9]">
            <div
              className="h-full rounded-[5px] bg-[#059669] transition-[width] duration-300"
              style={{ width: `${groceryPct}%` }}
            />
          </div>
        </Link>
      </section>

      <HomeTiles />
    </div>
  );
}
