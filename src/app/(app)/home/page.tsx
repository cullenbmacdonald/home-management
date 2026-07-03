import Link from "next/link";
import { inArray } from "drizzle-orm";
import { db } from "@/db";
import { settings } from "@/db/schema";

export const dynamic = "force-dynamic";

export default function HomePage() {
  const haConfigured =
    db
      .select({ key: settings.key })
      .from(settings)
      .where(inArray(settings.key, ["haBaseUrl", "haToken"]))
      .all().length >= 2;

  if (haConfigured) {
    return (
      <div className="rounded-[16px] border border-[#efece9] bg-white p-4 text-[13px] text-[#78716c]">
        Home tiles coming soon.
      </div>
    );
  }

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
