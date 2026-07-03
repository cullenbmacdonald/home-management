"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

/** The five primary tabs never show a back chevron. */
const PRIMARY_TABS = ["/", "/maintenance", "/plan", "/groceries", "/more"];

type Chrome = { title: string; subtitle?: string };

/** Exact-path titles; dynamic/sub-paths fall back to the prefix table below. */
const EXACT: Record<string, Chrome> = {
  "/": { title: "Home" },
  "/maintenance": { title: "Upkeep", subtitle: "Recurring home care" },
  "/maintenance/new": { title: "New item", subtitle: "Upkeep" },
  "/plan": { title: "Plan", subtitle: "Your week" },
  "/groceries": { title: "Shop", subtitle: "This week's list" },
  "/more": { title: "More", subtitle: "Everything else" },
  "/settings": { title: "Settings" },
  "/notifications": { title: "Notifications", subtitle: "Recent activity" },
  "/home": { title: "Home", subtitle: "Home Assistant" },
  "/tasks": { title: "Tasks" },
  "/wishlist": { title: "Wishlist" },
  "/inventory": { title: "Inventory" },
  "/documents": { title: "Documents" },
  "/vendors": { title: "Contacts" },
};

const PREFIX: [string, Chrome][] = [
  ["/maintenance", { title: "Upkeep", subtitle: "Recurring home care" }],
];

function resolve(pathname: string): Chrome {
  if (EXACT[pathname]) return EXACT[pathname];
  for (const [prefix, chrome] of PREFIX) {
    if (pathname.startsWith(prefix + "/")) return chrome;
  }
  return { title: "Homebase" };
}

export function AppHeader({
  user,
  unreadCount = 0,
}: {
  user: { displayName: string; accentColor: string } | null;
  unreadCount?: number;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { title, subtitle } = resolve(pathname);
  const showBack = !PRIMARY_TABS.includes(pathname);
  const initial = (user?.displayName ?? "?").charAt(0).toUpperCase();
  const accent = user?.accentColor ?? "#059669";
  const unread = unreadCount;

  return (
    <header className="sticky top-0 z-20 flex flex-none items-center gap-[11px] border-b border-[#efece9] bg-[rgba(250,249,248,0.94)] px-4 py-[13px] backdrop-blur-[10px]">
      {showBack && (
        <button
          type="button"
          aria-label="Back"
          onClick={() => router.back()}
          className="flex h-8 w-8 flex-none items-center justify-center rounded-full border border-[#e7e5e4] bg-white text-[19px] leading-none text-[#57534e]"
        >
          ‹
        </button>
      )}
      <div className="min-w-0 flex-1">
        <div className="font-serif text-[23px] leading-[1.05] tracking-[0.01em] text-[#1c1917]">
          {title}
        </div>
        {subtitle && (
          <div className="mt-0.5 text-[11px] tracking-[0.01em] text-[#a8a29e]">
            {subtitle}
          </div>
        )}
      </div>
      <Link
        href="/settings"
        aria-label="Settings"
        title={user?.displayName ?? "Account"}
        className="flex h-[34px] w-[34px] flex-none items-center justify-center rounded-full text-[13px] font-bold text-white"
        style={{ background: accent }}
      >
        {initial}
      </Link>
      <Link
        href="/notifications"
        aria-label="Notifications"
        className="relative flex h-[34px] w-[34px] flex-none items-center justify-center rounded-full border border-[#e7e5e4] bg-white"
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#57534e"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.7 21a2 2 0 0 1-3.4 0" />
        </svg>
        {unread > 0 && (
          <span
            data-unread-badge
            className="absolute -right-[3px] -top-[3px] flex h-[17px] min-w-[17px] items-center justify-center rounded-[9px] border-2 border-[#faf9f8] bg-[#dc2626] px-1 text-[10px] font-bold text-white"
          >
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </Link>
    </header>
  );
}
