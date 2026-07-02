import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { inventoryItems, rooms } from "@/db/schema";
import { createInventoryItem } from "./actions";
import { InventoryCard } from "@/components/inventory-card";

export const dynamic = "force-dynamic";

export default function InventoryPage() {
  const allRooms = db.select().from(rooms).orderBy(asc(rooms.sortOrder)).all();
  const items = db
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
    .orderBy(asc(inventoryItems.name))
    .all();

  return (
    <div className="space-y-4">
      <details className="rounded-xl bg-white p-3 shadow-sm">
        <summary className="cursor-pointer font-medium text-emerald-700">
          + Add appliance / item
        </summary>
        <form action={createInventoryItem} className="mt-3 space-y-2">
          <input
            name="name"
            required
            placeholder="Name (e.g. Kitchen mini-split)"
            className="w-full rounded-lg border border-stone-300 px-3 py-2.5"
          />
          <div className="grid grid-cols-2 gap-2">
            <select name="roomId" defaultValue="" className="rounded-lg border border-stone-300 bg-white px-2 py-2 text-sm">
              <option value="">Room…</option>
              {allRooms.map((r) => (
                <option key={r.id} value={r.id}>{r.name}</option>
              ))}
            </select>
            <input name="brand" placeholder="Brand" className="rounded-lg border border-stone-300 px-2 py-2 text-sm" />
            <input name="model" placeholder="Model #" className="rounded-lg border border-stone-300 px-2 py-2 text-sm" />
            <input name="serial" placeholder="Serial #" className="rounded-lg border border-stone-300 px-2 py-2 text-sm" />
            <label className="text-xs text-stone-500">
              Purchased
              <input name="purchaseDate" type="date" className="mt-0.5 w-full rounded-lg border border-stone-300 px-2 py-2 text-sm text-stone-900" />
            </label>
            <label className="text-xs text-stone-500">
              Warranty until
              <input name="warrantyUntil" type="date" className="mt-0.5 w-full rounded-lg border border-stone-300 px-2 py-2 text-sm text-stone-900" />
            </label>
          </div>
          <input name="manualUrl" type="url" placeholder="Manual URL (optional)" className="w-full rounded-lg border border-stone-300 px-2 py-2 text-sm" />
          <textarea name="notes" rows={2} placeholder="Notes (paint color codes go great here too)" className="w-full rounded-lg border border-stone-300 px-2 py-2 text-sm" />
          <button type="submit" className="w-full rounded-lg bg-emerald-700 py-2.5 font-semibold text-white">
            Add
          </button>
        </form>
      </details>

      <ul className="space-y-2">
        {items.map((item) => (
          <InventoryCard key={item.id} item={item} />
        ))}
        {items.length === 0 && (
          <li className="rounded-xl bg-white p-6 text-center text-stone-500">
            No items yet. Add your appliances so model numbers and warranties are always handy.
          </li>
        )}
      </ul>
    </div>
  );
}
