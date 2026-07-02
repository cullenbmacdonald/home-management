import { desc, eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { db } from "@/db";
import { maintenanceItems, maintenanceLogs, users } from "@/db/schema";
import {
  updateMaintenanceItem,
  deactivateMaintenanceItem,
} from "../actions";
import { IntervalField } from "@/components/interval-field";
import { MarkDoneButton } from "@/components/mark-done-button";

export const dynamic = "force-dynamic";

export default async function MaintenanceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const itemId = Number(id);
  const item = db
    .select()
    .from(maintenanceItems)
    .where(eq(maintenanceItems.id, itemId))
    .get();
  if (!item) notFound();

  const logs = db
    .select({
      id: maintenanceLogs.id,
      completedAt: maintenanceLogs.completedAt,
      notes: maintenanceLogs.notes,
      by: users.displayName,
    })
    .from(maintenanceLogs)
    .leftJoin(users, eq(maintenanceLogs.completedById, users.id))
    .where(eq(maintenanceLogs.itemId, itemId))
    .orderBy(desc(maintenanceLogs.completedAt))
    .all();

  const update = updateMaintenanceItem.bind(null, itemId);
  const deactivate = deactivateMaintenanceItem.bind(null, itemId);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">{item.name}</h1>
        <MarkDoneButton itemId={itemId} />
      </div>

      <form action={update} className="space-y-4 rounded-xl bg-white p-4 shadow-sm">
        <label className="block">
          <span className="text-sm font-medium text-stone-600">Name</span>
          <input
            name="name"
            defaultValue={item.name}
            required
            className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2.5 focus:border-emerald-600 focus:outline-none"
          />
        </label>
        <IntervalField defaultDays={item.intervalDays} />
        <label className="block">
          <span className="text-sm font-medium text-stone-600">Notes</span>
          <textarea
            name="notes"
            rows={3}
            defaultValue={item.notes ?? ""}
            className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2.5 focus:border-emerald-600 focus:outline-none"
          />
        </label>
        <button
          type="submit"
          className="w-full rounded-lg bg-emerald-700 py-2.5 font-semibold text-white active:bg-emerald-800"
        >
          Save changes
        </button>
      </form>

      <section className="rounded-xl bg-white p-4 shadow-sm">
        <h2 className="mb-2 font-semibold">History</h2>
        {logs.length === 0 ? (
          <p className="text-sm text-stone-500">Never done yet.</p>
        ) : (
          <ul className="divide-y divide-stone-100">
            {logs.map((log) => (
              <li key={log.id} className="py-2 text-sm">
                <span className="font-medium">
                  {log.completedAt.toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </span>
                {log.by && <span className="text-stone-500"> — {log.by}</span>}
                {log.notes && (
                  <div className="text-stone-500">{log.notes}</div>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <form action={deactivate}>
        <button
          type="submit"
          className="w-full rounded-lg border border-red-200 py-2.5 text-sm font-medium text-red-600"
        >
          Archive this item
        </button>
      </form>
    </div>
  );
}
