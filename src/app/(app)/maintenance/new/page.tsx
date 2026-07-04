import { asc } from "drizzle-orm";
import { db } from "@/db";
import { rooms } from "@/db/schema";
import { createMaintenanceItem } from "../actions";
import { IntervalField } from "@/components/interval-field";

export const dynamic = "force-dynamic";

const labelCls =
  "block text-[12px] font-bold uppercase tracking-[0.06em] text-[#a8a29e]";
const inputCls =
  "mt-1.5 w-full rounded-xl border border-[#e7e5e4] bg-white px-3 py-2.5 text-[15px] text-[#1c1917] focus:border-[#059669] focus:outline-none";

export default async function NewMaintenancePage() {
  const roomList = await db.select().from(rooms).orderBy(asc(rooms.sortOrder));

  return (
    <form
      action={createMaintenanceItem}
      className="space-y-4 rounded-[14px] border border-[#efece9] bg-white p-4"
    >
      <label className="block">
        <span className={labelCls}>Name</span>
        <input
          name="name"
          required
          placeholder="e.g. Clean mini-split filters"
          className={inputCls}
        />
      </label>
      <IntervalField />
      <label className="block">
        <span className={labelCls}>Room</span>
        <select name="roomId" defaultValue="" className={inputCls}>
          <option value="">No room</option>
          {roomList.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name}
            </option>
          ))}
        </select>
      </label>
      <label className="block">
        <span className={labelCls}>Start counting from</span>
        <input
          name="startDate"
          type="date"
          defaultValue={new Date().toISOString().slice(0, 10)}
          className={inputCls}
        />
      </label>
      <label className="block">
        <span className={labelCls}>Notes</span>
        <textarea name="notes" rows={3} className={inputCls} />
      </label>
      <button
        type="submit"
        className="w-full rounded-xl bg-[#059669] py-3 text-[15px] font-bold text-white active:bg-emerald-800"
      >
        Create
      </button>
    </form>
  );
}
