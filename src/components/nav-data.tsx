import type { ReactNode } from "react";

const icon = (path: ReactNode) => (
  <svg
    width="22"
    height="22"
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

export type NavItem = { href: string; label: string; icon: ReactNode };

/** The five destinations in the phone/iPad bottom bar. */
export const PRIMARY_NAV: NavItem[] = [
  {
    href: "/dashboard",
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

/**
 * Destinations hidden behind "More" on the phone. On the desktop rail there is
 * room to surface them directly, so the rail = PRIMARY_NAV (minus "More") + these.
 */
export const SECONDARY_NAV: NavItem[] = [
  {
    href: "/tasks",
    label: "Tasks",
    icon: icon(
      <>
        <path d="M9 11l3 3L22 4" />
        <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
      </>,
    ),
  },
  {
    href: "/inventory",
    label: "Inventory",
    icon: icon(
      <>
        <path d="M21 8 12 3 3 8v8l9 5 9-5V8z" />
        <path d="M3 8l9 5 9-5" />
        <path d="M12 13v8" />
      </>,
    ),
  },
  {
    href: "/documents",
    label: "Documents",
    icon: icon(
      <>
        <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
        <path d="M14 3v5h5" />
        <path d="M9 13h6M9 17h6" />
      </>,
    ),
  },
  {
    href: "/vendors",
    label: "Contacts",
    icon: icon(
      <>
        <path d="M4 5h16v14H4z" />
        <path d="M4 8l8 5 8-5" />
      </>,
    ),
  },
  {
    href: "/wishlist",
    label: "Wishlist",
    icon: icon(
      <path d="M12 3l2.09 5.26L20 9l-4 3.9L17.18 20 12 16.9 6.82 20 8 12.9 4 9l5.91-.74L12 3z" />,
    ),
  },
  {
    href: "/home",
    label: "Home Assistant",
    icon: icon(
      <>
        <path d="M12 3v3M12 18v3M4 12h3M17 12h3" />
        <circle cx="12" cy="12" r="4" />
      </>,
    ),
  },
];

/** Left side rail (desktop): primary destinations minus "More", plus the rest. */
export const RAIL_NAV: NavItem[] = [
  ...PRIMARY_NAV.filter((t) => t.href !== "/more"),
  ...SECONDARY_NAV,
];

/** Active-state match shared by every nav surface. */
export function isActive(pathname: string, href: string): boolean {
  return href === "/"
    ? pathname === "/"
    : pathname === href || pathname.startsWith(href + "/");
}
