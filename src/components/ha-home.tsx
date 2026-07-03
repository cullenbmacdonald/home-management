"use client";

import { useTransition } from "react";
import type { HaView } from "@/lib/ha";
import {
  adjustSetpoint,
  toggleLock,
  toggleSwitch,
} from "@/app/(app)/home/actions";

const SECTION_LABEL =
  "text-[12px] font-bold uppercase tracking-[0.06em] text-[#a8a29e] mx-1 mb-[9px]";

export function HaHome({
  view,
  reachable,
}: {
  view: HaView;
  reachable: boolean;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <div className="space-y-5">
      {!reachable && (
        <div
          data-ha-error
          className="rounded-[12px] border border-[#fecaca] bg-[#fef2f2] px-3 py-2 text-[13px] font-medium text-[#dc2626]"
        >
          Home Assistant unreachable
        </div>
      )}

      {view.temps.length > 0 && (
        <section>
          <h2 className={SECTION_LABEL}>Temperatures</h2>
          <div className="grid grid-cols-3 gap-[9px]">
            {view.temps.map((t) => (
              <div
                key={t.entityId}
                data-temp-tile
                className="rounded-[14px] border border-[#efece9] bg-white px-[10px] py-[13px] text-center"
              >
                <div className="text-[23px] font-extrabold text-[#1c1917]">
                  {t.value}
                </div>
                <div className="mt-0.5 text-[11px] text-[#a8a29e]">{t.name}</div>
              </div>
            ))}
          </div>
        </section>
      )}

      {view.climates.length > 0 && (
        <section>
          <h2 className={SECTION_LABEL}>Climate</h2>
          <div className="space-y-[9px]">
            {view.climates.map((c) => (
              <div
                key={c.entityId}
                data-climate-card
                className="flex items-center gap-[14px] rounded-[16px] border border-[#efece9] bg-white p-4"
              >
                <div className="flex-1">
                  <div className="text-[14px] font-semibold text-[#1c1917]">
                    {c.name}
                  </div>
                  <div className="mt-0.5 text-[12px] font-semibold text-[#059669]">
                    {c.mode}
                  </div>
                </div>
                <button
                  type="button"
                  aria-label="Lower setpoint"
                  disabled={pending || c.setpoint == null}
                  onClick={() =>
                    c.setpoint != null &&
                    startTransition(() =>
                      adjustSetpoint(c.entityId, c.setpoint!, -1),
                    )
                  }
                  className="h-[38px] w-[38px] flex-none rounded-full border border-[#e7e5e4] bg-[#faf9f8] text-[20px] text-[#57534e] disabled:opacity-40"
                >
                  −
                </button>
                <div
                  data-setpoint
                  className="w-[56px] flex-none text-center text-[26px] font-extrabold text-[#1c1917]"
                >
                  {c.setpoint != null ? `${c.setpoint}°` : "—"}
                </div>
                <button
                  type="button"
                  aria-label="Raise setpoint"
                  disabled={pending || c.setpoint == null}
                  onClick={() =>
                    c.setpoint != null &&
                    startTransition(() =>
                      adjustSetpoint(c.entityId, c.setpoint!, 1),
                    )
                  }
                  className="h-[38px] w-[38px] flex-none rounded-full border border-[#e7e5e4] bg-[#faf9f8] text-[20px] text-[#57534e] disabled:opacity-40"
                >
                  +
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {(view.locks.length > 0 || view.switches.length > 0) && (
        <section>
          <h2 className={SECTION_LABEL}>Locks &amp; switches</h2>
          <div className="overflow-hidden rounded-[16px] border border-[#efece9] bg-white">
            {view.locks.map((l, i) => (
              <button
                key={l.entityId}
                type="button"
                data-lock-row
                disabled={pending}
                onClick={() =>
                  startTransition(() => toggleLock(l.entityId, l.locked))
                }
                className="flex w-full items-center gap-3 border-b border-[#f0ede9] p-[14px] text-left disabled:opacity-60"
                style={{
                  borderBottom:
                    i === view.locks.length - 1 && view.switches.length === 0
                      ? "none"
                      : undefined,
                }}
              >
                <span className="flex-1 text-[15px] text-[#1c1917]">
                  {l.name}
                </span>
                <span
                  data-lock-label
                  className="text-[13px] font-bold"
                  style={{ color: l.locked ? "#059669" : "#dc2626" }}
                >
                  {l.locked ? "Locked" : "Unlocked"}
                </span>
                <Toggle on={l.locked} />
              </button>
            ))}
            {view.switches.map((sw, i) => (
              <button
                key={sw.entityId}
                type="button"
                data-switch-row
                disabled={pending}
                onClick={() =>
                  startTransition(() => toggleSwitch(sw.entityId, sw.on))
                }
                className="flex w-full items-center gap-3 p-[14px] text-left disabled:opacity-60"
                style={{
                  borderBottom:
                    i === view.switches.length - 1
                      ? "none"
                      : "1px solid #f0ede9",
                }}
              >
                <span className="flex-1 text-[15px] text-[#1c1917]">
                  {sw.name}
                </span>
                <Toggle on={sw.on} />
              </button>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function Toggle({ on }: { on: boolean }) {
  return (
    <span
      className="relative h-[26px] w-[44px] flex-none rounded-[14px]"
      style={{ background: on ? "#059669" : "#d6d3d1" }}
    >
      <span
        className="absolute top-[3px] h-[20px] w-[20px] rounded-full bg-white transition-[left] duration-200"
        style={{ left: on ? "21px" : "3px" }}
      />
    </span>
  );
}
