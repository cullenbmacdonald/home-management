import Link from "next/link";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { groceryItems } from "@/db/schema";
import { requireHousehold } from "@/lib/auth";
import { ShopList, type ShopRow } from "@/components/shop-list";

export const dynamic = "force-dynamic";

export default async function GroceriesPage() {
  const { householdId } = await requireHousehold();
  const rows = await db
    .select()
    .from(groceryItems)
    .where(eq(groceryItems.householdId, householdId));
  const items: ShopRow[] = rows.map((r) => ({
    id: r.id,
    name: r.name,
    category: r.category,
    qty: r.qty,
    checked: r.checked,
    isStaple: r.isStaple,
  }));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-end">
        <Link
          href="/groceries/staples"
          className="text-[13px] font-semibold text-[#57534e]"
        >
          Manage staples ›
        </Link>
      </div>
      <ShopList items={items} />
    </div>
  );
}
