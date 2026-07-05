import Link from "next/link";
import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { staples } from "@/db/schema";
import { requireHousehold } from "@/lib/auth";
import { StaplesManager, type StapleRow } from "@/components/staples-manager";

export const dynamic = "force-dynamic";

export default async function StaplesPage() {
  const { householdId } = await requireHousehold();
  const rows = await db
    .select()
    .from(staples)
    .where(eq(staples.householdId, householdId))
    .orderBy(asc(staples.name));
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
