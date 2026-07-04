import Link from "next/link";
import { listMaintenanceWithDue, getMaintenanceHistory } from "@/lib/maintenance";
import { getCurrentUser } from "@/lib/auth";
import { UpkeepList } from "@/components/upkeep-list";
import type { UpkeepRow, HistoryEntry } from "@/components/upkeep-list";

export const dynamic = "force-dynamic";

export default async function MaintenancePage() {
  const items = await listMaintenanceWithDue();
  const user = await getCurrentUser();

  const rows: UpkeepRow[] = items.map((item) => ({
    id: item.id,
    name: item.name,
    notes: item.notes,
    intervalDays: item.intervalDays,
    roomName: item.roomName,
    daysUntilDue: item.daysUntilDue,
    status: item.status,
  }));

  const histories: Record<number, HistoryEntry[]> = {};
  for (const item of items) {
    histories[item.id] = (await getMaintenanceHistory(item.id)).map((h) => ({
      id: h.id,
      at: h.completedAt.toISOString(),
      by: h.by,
      byColor: h.byColor,
      notes: h.notes,
    }));
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-end">
        <Link
          href="/maintenance/new"
          className="rounded-[10px] bg-[#059669] px-3 py-1.5 text-[13px] font-bold text-white"
        >
          + Add
        </Link>
      </div>
      <UpkeepList
        items={rows}
        histories={histories}
        userName={user?.displayName ?? "you"}
      />
    </div>
  );
}
