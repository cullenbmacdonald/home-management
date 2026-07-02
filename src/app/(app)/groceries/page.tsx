import { db } from "@/db";
import { groceryItems } from "@/db/schema";
import { ShopList, type ShopRow } from "@/components/shop-list";

export const dynamic = "force-dynamic";

export default function GroceriesPage() {
  const rows = db.select().from(groceryItems).all();
  const items: ShopRow[] = rows.map((r) => ({
    id: r.id,
    name: r.name,
    category: r.category,
    qty: r.qty,
    checked: r.checked,
    isStaple: r.isStaple,
  }));

  return <ShopList items={items} />;
}
