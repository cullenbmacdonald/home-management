import { and, asc, eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { db } from "@/db";
import { maintenanceItems, rooms } from "@/db/schema";
import { updateMaintenanceItem, deactivateMaintenanceItem } from "../actions";
import { requireHousehold } from "@/lib/auth";
import { IntervalField } from "@/components/interval-field";

export const dynamic = "force-dynamic";

const labelCls =
  "block text-[12px] font-bold uppercase tracking-[0.06em] text-[#a8a29e]";
const inputCls =
  "mt-1.5 w-full rounded-xl border border-[#e7e5e4] bg-white px-3 py-2.5 text-[15px] text-[#1c1917] focus:border-[#059669] focus:outline-none";

export default async function MaintenanceEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { householdId } = await requireHousehold();
  const { id } = await params;
  const itemId = Number(id);
  const item = (
    await db
      .select()
      .from(maintenanceItems)
      .where(
        and(
          eq(maintenanceItems.id, itemId),
          eq(maintenanceItems.householdId, householdId),
        ),
      )
      .limit(1)
  )[0];
  if (!item) notFound();

  const roomList = await db
    .select()
    .from(rooms)
    .where(eq(rooms.householdId, householdId))
    .orderBy(asc(rooms.sortOrder));
  const update = updateMaintenanceItem.bind(null, itemId);
  const deactivate = deactivateMaintenanceItem.bind(null, itemId);

  return (
    <div className="space-y-4">
      <form
        action={update}
        className="space-y-4 rounded-[14px] border border-[#efece9] bg-white p-4"
      >
        <label className="block">
          <span className={labelCls}>Name</span>
          <input
            name="name"
            defaultValue={item.name}
            required
            className={inputCls}
          />
        </label>
        <IntervalField defaultDays={item.intervalDays} />
        <label className="block">
          <span className={labelCls}>Room</span>
          <select
            name="roomId"
            defaultValue={item.roomId ?? ""}
            className={inputCls}
          >
            <option value="">No room</option>
            {roomList.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className={labelCls}>Notes</span>
          <textarea
            name="notes"
            rows={3}
            defaultValue={item.notes ?? ""}
            className={inputCls}
          />
        </label>
        <button
          type="submit"
          className="w-full rounded-xl bg-[#059669] py-3 text-[15px] font-bold text-white active:bg-emerald-800"
        >
          Save changes
        </button>
      </form>

      <form action={deactivate}>
        <button
          type="submit"
          className="w-full rounded-xl border border-red-200 bg-white py-2.5 text-[13px] font-semibold text-[#dc2626]"
        >
          Archive this item
        </button>
      </form>
    </div>
  );
}
