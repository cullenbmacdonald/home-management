"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

const icon = (path: ReactNode) => (
  <svg
    width="23"
    height="23"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    {path}
  </svg>
);

const tabs = [
  {
    href: "/",
    label: "Home",
    icon: icon(
      <>
        <path d="M3 10.5 12 3l9 7.5" />
        <path d="M5 9.5V20h14V9.5" />
      </>,
    ),
  },
  {
    href: "/maintenance",
    label: "Upkeep",
    icon: icon(
      <>
        <circle cx="12" cy="12" r="8.5" />
        <path d="M12 7.5V12l3 2" />
      </>,
    ),
  },
  {
    href: "/plan",
    label: "Plan",
    icon: icon(
      <>
        <rect x="3.5" y="5" width="17" height="15.5" rx="2.5" />
        <path d="M8 3v4M16 3v4M3.5 10h17" />
      </>,
    ),
  },
  {
    href: "/groceries",
    label: "Shop",
    icon: icon(
      <>
        <circle cx="9.5" cy="20" r="1.3" />
        <circle cx="17.5" cy="20" r="1.3" />
        <path d="M3 4h2.2l2.4 11.5h10L20 7.5H6.3" />
      </>,
    ),
  },
  {
    href: "/more",
    label: "More",
    icon: icon(
      <>
        <rect x="4" y="4" width="6.5" height="6.5" rx="1.5" />
        <rect x="13.5" y="4" width="6.5" height="6.5" rx="1.5" />
        <rect x="4" y="13.5" width="6.5" height="6.5" rx="1.5" />
        <rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1.5" />
      </>,
    ),
  },
];

export function BottomNav() {
  const pathname = usePathname();
  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 mx-auto flex max-w-[430px] border-t border-[#efece9] bg-white px-1 pt-2 pb-[calc(12px+env(safe-area-inset-bottom))]">
      {tabs.map((tab) => {
        const active =
          tab.href === "/"
            ? pathname === "/"
            : pathname === tab.href || pathname.startsWith(tab.href + "/");
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
