import Link from "next/link";
import { getStates, isHaConfigured, toView } from "@/lib/ha";
import { HaDashboardTiles } from "@/components/ha-dashboard-tiles";

/**
 * Home Assistant tiles on the dashboard. Unconfigured -> setup prompt;
 * configured -> compact live tiles (temps + lock + climate summary), degrading
 * to a small error chip when HA is unreachable.
 */
export async function HomeTiles() {
  const configured = isHaConfigured();

  return (
    <section>
      <h2 className="mx-1 mb-[9px] text-[12px] font-bold uppercase tracking-[0.06em] text-[#a8a29e]">
        Home
      </h2>
      {configured ? (
        await LiveTiles()
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

async function LiveTiles() {
  const result = await getStates();
  const view = result.ok
    ? toView(result.states)
    : { temps: [], climates: [], locks: [], switches: [] };
  return <HaDashboardTiles view={view} reachable={result.ok} />;
}
