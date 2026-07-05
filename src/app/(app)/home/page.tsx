import Link from "next/link";
import { getStates, isHaConfigured, toView } from "@/lib/ha";
import { requireHousehold } from "@/lib/auth";
import { HaHome } from "@/components/ha-home";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const { householdId } = await requireHousehold();
  if (!(await isHaConfigured(householdId))) {
    return (
      <Link
        href="/settings"
        className="block rounded-[16px] border border-[#efece9] bg-white p-5"
      >
        <div className="text-[15px] font-semibold text-[#1c1917]">
          Connect Home Assistant
        </div>
        <div className="mt-1 text-[13px] leading-[1.5] text-[#a8a29e]">
          Add your Home Assistant connection in Settings to see temperatures,
          locks, and climate here.
        </div>
      </Link>
    );
  }

  const result = await getStates(householdId);
  const view = result.ok
    ? toView(result.states)
    : { temps: [], climates: [], locks: [], switches: [] };

  return <HaHome view={view} reachable={result.ok} />;
}
