import { asc, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { rooms, wishlistItems } from "@/db/schema";
import { createWishlistItem } from "./actions";
import { WishlistCard } from "@/components/wishlist-card";
import { formatMoney } from "@/lib/format";

export const dynamic = "force-dynamic";

export default function WishlistPage() {
  const allRooms = db.select().from(rooms).orderBy(asc(rooms.sortOrder)).all();
  const items = db
    .select({
      id: wishlistItems.id,
      name: wishlistItems.name,
      url: wishlistItems.url,
      price: wishlistItems.price,
      status: wishlistItems.status,
      notes: wishlistItems.notes,
      roomName: rooms.name,
    })
    .from(wishlistItems)
    .leftJoin(rooms, eq(wishlistItems.roomId, rooms.id))
    .orderBy(desc(wishlistItems.createdAt))
    .all();

  const committed = items
    .filter((i) => i.status !== "considering" && i.price != null)
    .reduce((sum, i) => sum + (i.price ?? 0), 0);
  const considering = items
    .filter((i) => i.status === "considering" && i.price != null)
    .reduce((sum, i) => sum + (i.price ?? 0), 0);

  return (
    <div className="space-y-4">
      <div className="flex items-baseline justify-end">
        <div className="text-xs text-stone-500">
          committed {formatMoney(committed)} · considering{" "}
          {formatMoney(considering)}
        </div>
      </div>

      <form
        action={createWishlistItem}
        className="space-y-2 rounded-xl bg-white p-3 shadow-sm"
      >
        <input
          name="name"
          required
          placeholder="Add furniture / item…"
          className="w-full rounded-lg border border-stone-300 px-3 py-2.5 focus:border-emerald-600 focus:outline-none"
        />
        <div className="flex gap-2">
          <select
            name="roomId"
            defaultValue=""
            className="flex-1 rounded-lg border border-stone-300 bg-white px-2 py-2 text-sm"
          >
            <option value="">Room…</option>
            {allRooms.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
          <input
            name="price"
            type="number"
            step="0.01"
            min="0"
            placeholder="$"
            className="w-24 rounded-lg border border-stone-300 px-2 py-2 text-sm"
          />
        </div>
        <div className="flex gap-2">
          <input
            name="url"
            type="url"
            placeholder="Link (optional)"
            className="flex-1 rounded-lg border border-stone-300 px-2 py-2 text-sm"
          />
          <button
            type="submit"
            className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white"
          >
            Add
          </button>
        </div>
      </form>

      <ul className="space-y-2">
        {items.map((item) => (
          <WishlistCard key={item.id} item={item} />
        ))}
        {items.length === 0 && (
          <li className="rounded-xl bg-white p-6 text-center text-stone-500">
            Nothing on the wishlist yet.
          </li>
        )}
      </ul>
    </div>
  );
}
