"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { RAIL_NAV, isActive } from "@/components/nav-data";

/**
 * Desktop-only left navigation rail (>= xl). Replaces the bottom bar and
 * surfaces the "More" destinations directly since there's room.
 */
export function SideRail({
  user,
}: {
  user: { displayName: string; accentColor: string } | null;
}) {
  const pathname = usePathname();
  const initial = (user?.displayName ?? "?").charAt(0).toUpperCase();
  const accent = user?.accentColor ?? "#059669";

  return (
    <nav className="hidden w-[232px] flex-none flex-col border-r border-[#efece9] bg-white px-3 py-5 xl:flex">
      <div className="flex items-center gap-[10px] px-2 pb-6">
        <span
          className="flex h-[30px] w-[30px] flex-none items-center justify-center rounded-[9px] font-serif text-[17px] font-bold text-white"
          style={{ background: accent }}
        >
          H
        </span>
        <span className="font-serif text-[18px] text-[#1c1917]">Homebase</span>
      </div>

      <div className="flex flex-col gap-[2px]">
        {RAIL_NAV.map((tab) => {
          const active = isActive(pathname, tab.href);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              aria-current={active ? "page" : undefined}
              className={`flex items-center gap-3 rounded-[11px] px-3 py-[10px] text-[14px] ${
                active
                  ? "bg-[#ecfdf5] font-semibold text-[#059669]"
                  : "font-medium text-[#78716c] hover:bg-[#f5f2ef]"
              }`}
            >
              {tab.icon}
              {tab.label}
            </Link>
          );
        })}
      </div>

      <Link
        href="/settings"
        className="mt-auto flex items-center gap-[10px] rounded-[11px] border border-[#efece9] p-2"
      >
        <span
          className="flex h-[30px] w-[30px] flex-none items-center justify-center rounded-full text-[12px] font-bold text-white"
          style={{ background: accent }}
        >
          {initial}
        </span>
        <span className="min-w-0">
          <span className="block truncate text-[13px] font-semibold text-[#1c1917]">
            {user?.displayName ?? "Account"}
          </span>
          <span className="block text-[11px] text-[#a8a29e]">Settings</span>
        </span>
      </Link>
    </nav>
  );
}
