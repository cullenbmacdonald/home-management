"use client";

import Link from "next/link";
import { useTransition } from "react";
import type { HaView } from "@/lib/ha";
import { toggleLock } from "@/app/(app)/home/actions";

export function HaDashboardTiles({
  view,
  reachable,
}: {
  view: HaView;
  reachable: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const lock = view.locks[0];
  const climate = view.climates[0];

  return (
    <div>
      {!reachable && (
        <div
          data-ha-error
          className="mb-[9px] rounded-[10px] border border-[#fecaca] bg-[#fef2f2] px-[10px] py-1.5 text-[12px] font-medium text-[#dc2626]"
        >
          Home Assistant unreachable
        </div>
      )}
      <div className="grid grid-cols-2 gap-[9px]">
        {view.temps.map((t) => (
          <div
            key={t.entityId}
            data-temp-tile
            className="rounded-[14px] border border-[#efece9] bg-white p-[13px]"
          >
            <div className="text-[11px] text-[#a8a29e]">{t.name}</div>
            <div className="mt-0.5 text-[24px] font-bold text-[#1c1917]">
              {t.value}
            </div>
          </div>
        ))}
        {lock && (
          <button
            type="button"
            data-lock-tile
            disabled={pending}
            onClick={() =>
              startTransition(() => toggleLock(lock.entityId, lock.locked))
            }
            className="rounded-[14px] border p-[13px] text-left disabled:opacity-60"
            style={{
              background: lock.locked ? "#fff" : "#fef2f2",
              borderColor: lock.locked ? "#efece9" : "#fecaca",
            }}
          >
            <div className="text-[11px] text-[#a8a29e]">{lock.name}</div>
            <div
              className="mt-1 text-[17px] font-bold"
              style={{ color: lock.locked ? "#059669" : "#dc2626" }}
            >
              {lock.locked ? "Locked" : "Unlocked"}
            </div>
          </button>
        )}
        {climate && (
          <Link
            href="/home"
            data-climate-tile
            className="rounded-[14px] border border-[#efece9] bg-white p-[13px]"
          >
            <div className="text-[11px] text-[#a8a29e]">{climate.name}</div>
            <div className="mt-1 text-[17px] font-bold text-[#1c1917]">
              {climate.setpoint != null ? `${climate.setpoint}° set` : climate.mode}
            </div>
          </Link>
        )}
      </div>
    </div>
  );
}
