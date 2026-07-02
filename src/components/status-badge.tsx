import type { MaintenanceStatus } from "@/lib/maintenance";
import { dueLabel } from "@/lib/format";

const styles: Record<MaintenanceStatus, string> = {
  overdue: "bg-red-100 text-red-700",
  "due-soon": "bg-amber-100 text-amber-700",
  ok: "bg-stone-100 text-stone-500",
};

export function DueBadge({
  status,
  daysUntilDue,
}: {
  status: MaintenanceStatus;
  daysUntilDue: number;
}) {
  return (
    <span
      className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${styles[status]}`}
    >
      {dueLabel(daysUntilDue)}
    </span>
  );
}
