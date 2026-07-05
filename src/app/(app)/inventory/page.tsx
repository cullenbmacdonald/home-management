import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { inventoryItems, rooms } from "@/db/schema";
import { createInventoryItem } from "./actions";
import { requireHousehold } from "@/lib/auth";
import { InventoryCard } from "@/components/inventory-card";

export const dynamic = "force-dynamic";

export default async function InventoryPage() {
  const { householdId } = await requireHousehold();
  const allRooms = await db
    .select()
    .from(rooms)
    .where(eq(rooms.householdId, householdId))
    .orderBy(asc(rooms.sortOrder));
  const items = await db
    .select({
      id: inventoryItems.id,
      name: inventoryItems.name,
      brand: inventoryItems.brand,
      model: inventoryItems.model,
      serial: inventoryItems.serial,
      purchaseDate: inventoryItems.purchaseDate,
      warrantyUntil: inventoryItems.warrantyUntil,
      manualUrl: inventoryItems.manualUrl,
      notes: inventoryItems.notes,
      roomName: rooms.name,
    })
    .from(inventoryItems)
    .leftJoin(rooms, eq(inventoryItems.roomId, rooms.id))
    .where(eq(inventoryItems.householdId, householdId))
    .orderBy(asc(inventoryItems.name));

  return (
    <div className="space-y-4">
      <details className="rounded-[14px] border border-[#efece9] bg-white p-3">
        <summary className="cursor-pointer text-[14px] font-semibold text-[#059669]">
          + Add appliance / item
        </summary>
        <form action={createInventoryItem} className="mt-3 space-y-2">
          <input
            name="name"
            required
            placeholder="Name (e.g. Kitchen mini-split)"
            className="w-full rounded-[10px] border border-[#e7e5e4] px-3 py-2.5 text-[14px] placeholder:text-[#a8a29e] focus:border-[#059669] focus:outline-none"
          />
          <div className="grid grid-cols-2 gap-2">
            <select name="roomId" defaultValue="" className="rounded-[10px] border border-[#e7e5e4] bg-white px-2 py-2 text-[13px]">
              <option value="">Room…</option>
              {allRooms.map((r) => (
                <option key={r.id} value={r.id}>{r.name}</option>
              ))}
            </select>
            <input name="brand" placeholder="Brand" className="rounded-[10px] border border-[#e7e5e4] px-2 py-2 text-[13px]" />
            <input name="model" placeholder="Model #" className="rounded-[10px] border border-[#e7e5e4] px-2 py-2 text-[13px]" />
            <input name="serial" placeholder="Serial #" className="rounded-[10px] border border-[#e7e5e4] px-2 py-2 text-[13px]" />
            <label className="text-[11px] text-[#a8a29e]">
              Purchased
              <input name="purchaseDate" type="date" className="mt-0.5 w-full rounded-[10px] border border-[#e7e5e4] px-2 py-2 text-[13px] text-[#1c1917]" />
            </label>
            <label className="text-[11px] text-[#a8a29e]">
              Warranty until
              <input name="warrantyUntil" type="date" className="mt-0.5 w-full rounded-[10px] border border-[#e7e5e4] px-2 py-2 text-[13px] text-[#1c1917]" />
            </label>
          </div>
          <input name="manualUrl" type="url" placeholder="Manual URL (optional)" className="w-full rounded-[10px] border border-[#e7e5e4] px-2 py-2 text-[13px]" />
          <textarea name="notes" rows={2} placeholder="Notes (paint color codes go great here too)" className="w-full rounded-[10px] border border-[#e7e5e4] px-2 py-2 text-[13px]" />
          <button type="submit" className="w-full rounded-[10px] bg-[#059669] py-2.5 text-[14px] font-bold text-white active:bg-emerald-800">
            Add
          </button>
        </form>
      </details>

      <ul className="space-y-[9px]">
        {items.map((item) => (
          <InventoryCard key={item.id} item={item} />
        ))}
        {items.length === 0 && (
          <li className="rounded-[14px] border border-[#efece9] bg-white p-6 text-center text-[#a8a29e]">
            No items yet. Add your appliances so model numbers and warranties are always handy.
          </li>
        )}
      </ul>
    </div>
  );
}
