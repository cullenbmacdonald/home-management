"use client";

import { useTransition } from "react";
import { markAllNotificationsRead } from "@/app/(app)/notifications/actions";

export function MarkAllRead() {
  const [pending, startTransition] = useTransition();
  return (
    <button
      type="button"
      data-mark-all-read
      disabled={pending}
      onClick={() => startTransition(() => markAllNotificationsRead())}
      className="mb-3 w-full rounded-[11px] border border-[#e7e5e4] bg-white py-[10px] text-[13px] font-semibold text-[#57534e] disabled:opacity-60"
    >
      Mark all as read
    </button>
  );
}
