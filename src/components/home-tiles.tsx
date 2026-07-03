import Link from "next/link";
import { inArray } from "drizzle-orm";
import { db } from "@/db";
import { settings } from "@/db/schema";

/**
 * Home Assistant tiles seam. HA is Phase 9 — until a base URL + token exist in
 * the settings table, this renders a setup prompt. Live tiles slot in here.
 */
export function HomeTiles() {
  const configured = db
    .select({ key: settings.key })
    .from(settings)
    .where(inArray(settings.key, ["haBaseUrl", "haToken"]))
    .all();

  const haConfigured = configured.length >= 2;

  return (
    <section>
      <h2 className="mx-1 mb-[9px] mt-[22px] text-[12px] font-bold uppercase tracking-[0.06em] text-[#a8a29e]">
        Home
      </h2>
      {haConfigured ? (
        // Phase 9 fills this with live temp/lock/climate tiles.
        <div className="rounded-[16px] border border-[#efece9] bg-white p-4 text-[13px] text-[#78716c]">
          Home tiles coming soon.
        </div>
      ) : (
        <Link
          href="/settings"
          className="block rounded-[16px] border border-[#efece9] bg-white p-4"
        >
          <div className="text-[14px] font-semibold text-[#1c1917]">
            Connect Home Assistant
          </div>
          <div className="mt-1 text-[12px] leading-[1.5] text-[#a8a29e]">
            Add your Home Assistant connection in Settings to see temperatures,
            locks, and climate here.
          </div>
        </Link>
      )}
    </section>
  );
}
