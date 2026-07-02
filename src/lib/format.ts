export function formatDate(d: Date | string | null | undefined): string {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d + "T00:00:00") : d;
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: date.getFullYear() === new Date().getFullYear() ? undefined : "numeric",
  });
}

export function dueLabel(daysUntilDue: number): string {
  if (daysUntilDue < -1) return `${-daysUntilDue} days overdue`;
  if (daysUntilDue === -1) return "1 day overdue";
  if (daysUntilDue === 0) return "Due today";
  if (daysUntilDue === 1) return "Due tomorrow";
  return `Due in ${daysUntilDue} days`;
}

export function formatMoney(n: number | null): string {
  if (n == null) return "—";
  return n.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });
}

export function intervalLabel(days: number): string {
  if (days % 365 === 0) {
    const y = days / 365;
    return y === 1 ? "yearly" : `every ${y} years`;
  }
  if (days % 30 === 0) {
    const m = days / 30;
    return m === 1 ? "monthly" : `every ${m} months`;
  }
  if (days % 7 === 0) {
    const w = days / 7;
    return w === 1 ? "weekly" : `every ${w} weeks`;
  }
  return `every ${days} days`;
}
