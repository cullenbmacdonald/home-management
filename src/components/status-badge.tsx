import type { MaintenanceStatus } from "@/lib/maintenance";
import { dueBadgeLabel } from "@/lib/format";

const styles: Record<MaintenanceStatus, string> = {
  overdue: "bg-[#fef2f2] text-[#dc2626]",
  "due-soon": "bg-[#fffbeb] text-[#b45309]",
  ok: "bg-[#f5f5f4] text-[#78716c]",
};

const sizes = {
  sm: "text-[11px] px-[7px] py-[2px] rounded-[6px]",
  md: "text-[12px] px-[9px] py-[3px] rounded-[7px]",
} as const;

export function DueBadge({
  status,
  daysUntilDue,
  size = "sm",
}: {
  status: MaintenanceStatus;
  daysUntilDue: number;
  size?: keyof typeof sizes;
}) {
  return (
    <span
      className={`inline-block font-bold ${sizes[size]} ${styles[status]}`}
    >
      {dueBadgeLabel(daysUntilDue)}
    </span>
  );
}
