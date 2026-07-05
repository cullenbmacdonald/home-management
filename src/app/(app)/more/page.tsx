import Link from "next/link";
import { and, eq, isNull, ne, inArray } from "drizzle-orm";
import type { ReactNode } from "react";
import { db } from "@/db";
import {
  tasks,
  wishlistItems,
  notifications,
  inventoryItems,
  documents,
  vendors,
  settings,
} from "@/db/schema";
import { requireHousehold } from "@/lib/auth";

export const dynamic = "force-dynamic";

const iconProps = {
  width: 20,
  height: 20,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

const icons: Record<string, ReactNode> = {
  tasks: (
    <svg {...iconProps}>
      <path d="M9 11l3 3L22 4" />
      <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
    </svg>
  ),
  wishlist: (
    <svg {...iconProps}>
      <path d="M12 3l2.09 5.26L20 9l-4 3.9L17.18 20 12 16.9 6.82 20 8 12.9 4 9l5.91-.74L12 3z" />
    </svg>
  ),
  notifications: (
    <svg {...iconProps}>
      <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.7 21a2 2 0 0 1-3.4 0" />
    </svg>
  ),
  home: (
    <svg {...iconProps}>
      <path d="M3 10.5 12 3l9 7.5" />
      <path d="M5 9.5V20a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V9.5" />
      <path d="M9 21v-6h6v6" />
    </svg>
  ),
  inventory: (
    <svg {...iconProps}>
      <path d="M21 8 12 3 3 8v8l9 5 9-5V8z" />
      <path d="M3 8l9 5 9-5" />
      <path d="M12 13v8" />
    </svg>
  ),
  documents: (
    <svg {...iconProps}>
      <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
      <path d="M14 3v5h5" />
      <path d="M9 13h6M9 17h6" />
    </svg>
  ),
  contacts: (
    <svg {...iconProps}>
      <path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3 19.5 19.5 0 0 1-6-6 19.8 19.8 0 0 1-3-8.6A2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.3 1.8.6 2.6a2 2 0 0 1-.5 2.1L8 9.6a16 16 0 0 0 6 6l1.2-1.2a2 2 0 0 1 2.1-.5c.8.3 1.7.5 2.6.6a2 2 0 0 1 1.7 2Z" />
    </svg>
  ),
  settings: (
    <svg {...iconProps}>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  ),
};

export default async function MorePage() {
  const { householdId } = await requireHousehold();
  const openTasks = (
    await db
      .select({ id: tasks.id })
      .from(tasks)
      .where(and(eq(tasks.householdId, householdId), isNull(tasks.completedAt)))
  ).length;
  const activeWishlist = (
    await db
      .select({ id: wishlistItems.id })
      .from(wishlistItems)
      .where(
        and(
          eq(wishlistItems.householdId, householdId),
          ne(wishlistItems.status, "delivered"),
        ),
      )
  ).length;
  const unread = (
    await db
      .select({ id: notifications.id })
      .from(notifications)
      .where(
        and(
          eq(notifications.householdId, householdId),
          isNull(notifications.readAt),
        ),
      )
  ).length;
  const inventoryCount = (
    await db
      .select({ id: inventoryItems.id })
      .from(inventoryItems)
      .where(eq(inventoryItems.householdId, householdId))
  ).length;
  const documentCount = (
    await db
      .select({ id: documents.id })
      .from(documents)
      .where(eq(documents.householdId, householdId))
  ).length;
  const contactCount = (
    await db
      .select({ id: vendors.id })
      .from(vendors)
      .where(eq(vendors.householdId, householdId))
  ).length;
  const haConfigured =
    (
      await db
        .select({ key: settings.key })
        .from(settings)
        .where(
          and(
            eq(settings.householdId, householdId),
            inArray(settings.key, ["haBaseUrl", "haToken"]),
          ),
        )
    ).length >= 2;

  const tiles = [
    { key: "tasks", href: "/tasks", label: "Tasks", sub: `${openTasks} open`, iconBg: "#ecfdf5", iconFg: "#059669" },
    { key: "wishlist", href: "/wishlist", label: "Wishlist", sub: `${activeWishlist} active`, iconBg: "#fef3c7", iconFg: "#b45309" },
    { key: "notifications", href: "/notifications", label: "Notifications", sub: `${unread} unread`, iconBg: "#fee2e2", iconFg: "#dc2626" },
    { key: "home", href: "/home", label: "Home", sub: haConfigured ? "Connected" : "Not connected", iconBg: "#dbeafe", iconFg: "#0369a1" },
    { key: "inventory", href: "/inventory", label: "Inventory", sub: `${inventoryCount} items`, iconBg: "#f5f2ef", iconFg: "#78716c" },
    { key: "documents", href: "/documents", label: "Documents", sub: `${documentCount} files`, iconBg: "#f5f2ef", iconFg: "#78716c" },
    { key: "contacts", href: "/vendors", label: "Contacts", sub: `${contactCount} contacts`, iconBg: "#f5f2ef", iconFg: "#78716c" },
    { key: "settings", href: "/settings", label: "Settings", sub: "—", iconBg: "#f5f2ef", iconFg: "#78716c" },
  ];

  return (
    <div>
      <div className="grid grid-cols-2 gap-[11px]">
        {tiles.map((t) => (
          <Link
            key={t.key}
            href={t.href}
            data-tile={t.key}
            className="flex min-h-[96px] flex-col justify-between rounded-[16px] border border-[#efece9] bg-white p-[16px_15px]"
          >
            <span
              className="flex h-9 w-9 items-center justify-center rounded-[10px]"
              style={{ background: t.iconBg, color: t.iconFg }}
            >
              {icons[t.key]}
            </span>
            <span>
              <span className="block text-[14px] font-semibold text-[#1c1917]">
                {t.label}
              </span>
              <span className="mt-px block text-[11px] text-[#a8a29e]" data-sub>
                {t.sub}
              </span>
            </span>
          </Link>
        ))}
      </div>
      <div className="mt-[26px] text-center text-[12px] text-[#c7c2bc]">
        Homebase · self-hosted
      </div>
    </div>
  );
}
