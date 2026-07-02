import Link from "next/link";
import { listMaintenanceWithDue } from "@/lib/maintenance";
import { formatDate, intervalLabel } from "@/lib/format";
import { DueBadge } from "@/components/status-badge";
import { MarkDoneButton } from "@/components/mark-done-button";

export const dynamic = "force-dynamic";

export default function MaintenancePage() {
  const items = listMaintenanceWithDue();
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Upkeep</h1>
        <Link
          href="/maintenance/new"
          className="rounded-lg bg-emerald-700 px-3 py-1.5 text-sm font-semibold text-white"
        >
          + Add
        </Link>
      </div>
      <ul className="space-y-2">
        {items.map((item) => (
          <li
            key={item.id}
            className="flex items-center gap-3 rounded-xl bg-white p-4 shadow-sm"
          >
            <Link href={`/maintenance/${item.id}`} className="min-w-0 flex-1">
              <div className="font-medium">{item.name}</div>
              <div className="mt-0.5 text-xs text-stone-500">
                {intervalLabel(item.intervalDays)} · last:{" "}
                {item.lastDone
                  ? `${formatDate(item.lastDone)}${item.lastDoneBy ? ` by ${item.lastDoneBy}` : ""}`
                  : "never"}
              </div>
              <div className="mt-1.5">
                <DueBadge status={item.status} daysUntilDue={item.daysUntilDue} />
              </div>
            </Link>
            <MarkDoneButton itemId={item.id} />
          </li>
        ))}
        {items.length === 0 && (
          <li className="rounded-xl bg-white p-6 text-center text-stone-500">
            No maintenance items yet.
          </li>
        )}
      </ul>
    </div>
  );
}
