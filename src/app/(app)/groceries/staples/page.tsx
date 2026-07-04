import Link from "next/link";
import { asc } from "drizzle-orm";
import { db } from "@/db";
import { staples } from "@/db/schema";
import { StaplesManager, type StapleRow } from "@/components/staples-manager";

export const dynamic = "force-dynamic";

export default async function StaplesPage() {
  const rows = await db.select().from(staples).orderBy(asc(staples.name));
  const items: StapleRow[] = rows.map((r) => ({
    id: r.id,
    name: r.name,
    category: r.category,
  }));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Link
          href="/groceries"
          className="text-[13px] font-semibold text-[#57534e]"
        >
          ‹ Groceries
        </Link>
        <span className="text-[13px] font-bold text-[#1c1917]">Staples</span>
      </div>
      <StaplesManager items={items} />
    </div>
  );
}
