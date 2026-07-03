"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { PRIMARY_NAV, isActive } from "@/components/nav-data";

export function BottomNav() {
  const pathname = usePathname();
  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 mx-auto flex max-w-[430px] border-t border-[#efece9] bg-white px-1 pt-2 pb-[calc(12px+env(safe-area-inset-bottom))] md:inset-x-auto md:bottom-4 md:left-1/2 md:w-[500px] md:max-w-[calc(100%-32px)] md:-translate-x-1/2 md:rounded-[22px] md:border md:px-3 md:pb-2 md:shadow-[0_8px_24px_rgba(28,25,23,0.12)] xl:hidden">
      {PRIMARY_NAV.map((tab) => {
        const active = isActive(pathname, tab.href);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={active ? "page" : undefined}
            className={`flex flex-1 flex-col items-center gap-[3px] py-1 ${
              active ? "text-[#059669]" : "text-stone-400"
            }`}
          >
            {tab.icon}
            <span
              className={`text-[10px] ${active ? "font-semibold" : "font-medium"}`}
            >
              {tab.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
