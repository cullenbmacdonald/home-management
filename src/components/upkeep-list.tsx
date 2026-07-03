"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { intervalLabel } from "@/lib/format";
import { DueBadge } from "@/components/status-badge";
import type { MaintenanceStatus } from "@/lib/maintenance";
import { BottomSheet } from "@/components/bottom-sheet";
import {
  markDone,
  deactivateMaintenanceItem,
} from "@/app/(app)/maintenance/actions";

export interface UpkeepRow {
  id: number;
  name: string;
  notes: string | null;
  intervalDays: number;
  roomName: string | null;
  daysUntilDue: number;
  status: MaintenanceStatus;
}

export interface HistoryEntry {
  id: number;
  at: string; // ISO
  by: string | null;
  byColor: string | null;
  notes: string | null;
}

function metaLine(item: UpkeepRow): string {
  const base = intervalLabel(item.intervalDays);
  return item.roomName ? `${base} · ${item.roomName}` : base;
}

function relativeDate(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const days = Math.floor(
    (new Date(now.toDateString()).getTime() - new Date(d.toDateString()).getTime()) /
      86400000,
  );
  if (days <= 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: d.getFullYear() === now.getFullYear() ? undefined : "numeric",
  });
}

export function UpkeepList({
  items,
  histories,
  userName,
}: {
  items: UpkeepRow[];
  histories: Record<number, HistoryEntry[]>;
  userName: string;
}) {
  const [openId, setOpenId] = useState<number | null>(null);
  const [pending, startTransition] = useTransition();
  const open = openId != null ? items.find((i) => i.id === openId) ?? null : null;

  const done = (id: number) =>
    startTransition(async () => {
      await markDone(id);
      setOpenId(null);
    });

  const archive = (id: number) =>
    startTransition(async () => {
      await deactivateMaintenanceItem(id);
      setOpenId(null);
    });

  return (
    <>
      <div className="space-y-[9px]">
        {items.map((item) => (
          <div
            key={item.id}
            className="flex items-center gap-3 rounded-[14px] border border-[#efece9] bg-white px-[14px] py-[13px]"
          >
            <button
              type="button"
              onClick={() => setOpenId(item.id)}
              className="min-w-0 flex-1 text-left"
            >
              <div className="text-[15px] font-semibold text-[#1c1917]">
                {item.name}
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-[7px]">
                <DueBadge status={item.status} daysUntilDue={item.daysUntilDue} />
                <span className="text-[11px] text-[#a8a29e]">
                  {metaLine(item)}
                </span>
              </div>
            </button>
            <button
              type="button"
              onClick={() => done(item.id)}
              disabled={pending}
              className="flex min-h-[44px] flex-none items-center justify-center rounded-[10px] bg-[#059669] px-[13px] py-2 text-[13px] font-bold text-white active:bg-emerald-800 disabled:opacity-50"
            >
              Done
            </button>
          </div>
        ))}
        {items.length === 0 && (
          <div className="rounded-[14px] border border-[#efece9] bg-white p-6 text-center text-[#a8a29e]">
            No upkeep items yet.
          </div>
        )}
      </div>

      <BottomSheet
        open={open != null}
        onClose={() => setOpenId(null)}
        surface="bg-[#faf9f8]"
      >
        {open && (
          <div>
            <div className="font-serif text-[26px] leading-[1.1] text-[#1c1917]">
              {open.name}
            </div>
            <div className="mt-2 flex items-center gap-[7px]">
              <DueBadge
                status={open.status}
                daysUntilDue={open.daysUntilDue}
                size="md"
              />
              <span className="text-[12px] text-[#a8a29e]">
                {metaLine(open)}
              </span>
            </div>

            {open.notes && (
              <div className="mt-[14px] rounded-[12px] border border-[#efece9] bg-white px-[14px] py-3 text-[14px] leading-[1.5] text-[#57534e]">
                {open.notes}
              </div>
            )}

            <button
              type="button"
              onClick={() => done(open.id)}
              disabled={pending}
              className="mt-4 w-full rounded-[13px] bg-[#059669] py-[14px] text-[15px] font-bold text-white active:bg-emerald-800 disabled:opacity-50"
            >
              Mark done as {userName}
            </button>

            <div className="mb-[10px] ml-[2px] mt-[22px] text-[12px] font-bold uppercase tracking-[0.06em] text-[#a8a29e]">
              History
            </div>
            {(histories[open.id] ?? []).length === 0 ? (
              <div className="ml-[2px] text-[14px] text-[#a8a29e]">
                Never done yet.
              </div>
            ) : (
              <div>
                {(histories[open.id] ?? []).map((h) => (
                  <div
                    key={h.id}
                    className="flex items-center gap-3 border-b border-[#f0ede9] py-[11px]"
                  >
                    <span
                      className="h-2 w-2 flex-none rounded-full"
                      style={{ background: h.byColor ?? "#059669" }}
                    />
                    <div className="flex-1 text-[14px] text-[#1c1917]">
                      {relativeDate(h.at)}
                      {h.notes && (
                        <span className="text-[#a8a29e]"> — {h.notes}</span>
                      )}
                    </div>
                    {h.by && (
                      <div className="text-[12px] text-[#a8a29e]">{h.by}</div>
                    )}
                  </div>
                ))}
              </div>
            )}

            <div className="mt-5 flex gap-2">
              <Link
                href={`/maintenance/${open.id}`}
                className="flex-1 rounded-[11px] border border-[#e7e5e4] bg-white py-[11px] text-center text-[13px] font-semibold text-[#57534e]"
              >
                Edit
              </Link>
              <button
                type="button"
                onClick={() => archive(open.id)}
                disabled={pending}
                className="flex-1 rounded-[11px] border border-red-200 bg-white py-[11px] text-[13px] font-semibold text-[#dc2626] disabled:opacity-50"
              >
                Archive
              </button>
            </div>
          </div>
        )}
      </BottomSheet>
    </>
  );
}
