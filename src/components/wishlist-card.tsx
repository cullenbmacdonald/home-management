"use client";

import { useTransition } from "react";
import {
  setWishlistStatus,
  deleteWishlistItem,
} from "@/app/(app)/wishlist/actions";
import { formatMoney } from "@/lib/format";

const statusStyles: Record<string, string> = {
  considering: "bg-stone-100 text-stone-600",
  decided: "bg-blue-100 text-blue-700",
  ordered: "bg-amber-100 text-amber-700",
  delivered: "bg-emerald-100 text-emerald-700",
};
const statuses = ["considering", "decided", "ordered", "delivered"];

interface WishlistData {
  id: number;
  name: string;
  url: string | null;
  price: number | null;
  status: string;
  notes: string | null;
  roomName: string | null;
}

export function WishlistCard({ item }: { item: WishlistData }) {
  const [pending, startTransition] = useTransition();
  return (
    <li className="rounded-xl bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="font-medium">
            {item.url ? (
              <a
                href={item.url}
                target="_blank"
                rel="noreferrer"
                className="text-emerald-800 underline decoration-emerald-300 underline-offset-2"
              >
                {item.name} ↗
              </a>
            ) : (
              item.name
            )}
          </div>
          <div className="text-xs text-stone-500">
            {item.roomName ?? "No room"} · {formatMoney(item.price)}
          </div>
          {item.notes && (
            <div className="mt-1 text-sm text-stone-500">{item.notes}</div>
          )}
        </div>
        <button
          onClick={() => startTransition(() => deleteWishlistItem(item.id))}
          disabled={pending}
          aria-label="Delete item"
          className="px-1 text-stone-300 active:text-red-500"
        >
          ✕
        </button>
      </div>
      <div className="mt-3 flex gap-1.5">
        {statuses.map((s) => (
          <button
            key={s}
            onClick={() => startTransition(() => setWishlistStatus(item.id, s))}
            disabled={pending}
            className={`rounded-full px-2.5 py-1 text-xs font-medium capitalize ${
              item.status === s
                ? statusStyles[s] + " ring-1 ring-current"
                : "bg-stone-50 text-stone-400"
            }`}
          >
            {s}
          </button>
        ))}
      </div>
    </li>
  );
}
