import { asc, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { rooms, wishlistItems } from "@/db/schema";
import { createWishlistItem } from "./actions";
import { WishlistCard } from "@/components/wishlist-card";
import { formatMoney } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function WishlistPage() {
  const allRooms = await db.select().from(rooms).orderBy(asc(rooms.sortOrder));
  const items = await db
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
    .orderBy(desc(wishlistItems.createdAt));

  const committed = items
    .filter((i) => i.status !== "considering" && i.price != null)
    .reduce((sum, i) => sum + (i.price ?? 0), 0);
  const considering = items
    .filter((i) => i.status === "considering" && i.price != null)
    .reduce((sum, i) => sum + (i.price ?? 0), 0);

  return (
    <div className="space-y-4">
      <div className="flex gap-[10px]">
        <div className="flex-1 rounded-[14px] border border-[#d1fae5] bg-[#ecfdf5] p-[13px]">
          <div className="text-[11px] font-semibold text-[#059669]">Committed</div>
          <div
            data-stat="committed"
            className="mt-[2px] text-[22px] font-extrabold text-[#047857]"
          >
            {formatMoney(committed)}
          </div>
        </div>
        <div className="flex-1 rounded-[14px] border border-[#efece9] bg-white p-[13px]">
          <div className="text-[11px] font-semibold text-[#a8a29e]">
            Considering
          </div>
          <div
            data-stat="considering"
            className="mt-[2px] text-[22px] font-extrabold text-[#57534e]"
          >
            {formatMoney(considering)}
          </div>
        </div>
      </div>

      <form
        action={createWishlistItem}
        className="space-y-2 rounded-[14px] border border-[#efece9] bg-white p-3"
      >
        <input
          name="name"
          required
          placeholder="Add furniture / item…"
          className="w-full rounded-[10px] border border-[#e7e5e4] px-3 py-2.5 text-[14px] placeholder:text-[#a8a29e] focus:border-[#059669] focus:outline-none"
        />
        <div className="flex gap-2">
          <select
            name="roomId"
            defaultValue=""
            className="flex-1 rounded-[10px] border border-[#e7e5e4] bg-white px-2 py-2 text-[13px]"
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
            className="w-24 rounded-[10px] border border-[#e7e5e4] px-2 py-2 text-[13px]"
          />
        </div>
        <div className="flex gap-2">
          <input
            name="url"
            type="url"
            placeholder="Link (optional)"
            className="flex-1 rounded-[10px] border border-[#e7e5e4] px-2 py-2 text-[13px]"
          />
          <button
            type="submit"
            className="rounded-[10px] bg-[#059669] px-4 py-2 text-[13px] font-bold text-white active:bg-emerald-800"
          >
            Add
          </button>
        </div>
      </form>

      <ul className="space-y-[10px]">
        {items.map((item) => (
          <WishlistCard key={item.id} item={item} />
        ))}
        {items.length === 0 && (
          <li className="rounded-[14px] border border-[#efece9] bg-white p-6 text-center text-[#a8a29e]">
            Nothing on the wishlist yet.
          </li>
        )}
      </ul>
    </div>
  );
}
