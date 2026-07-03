"use client";

import { useTransition } from "react";
import {
  advanceWishlistItem,
  deleteWishlistItem,
} from "@/app/(app)/wishlist/actions";
import { formatMoney } from "@/lib/format";

const ORDER = ["considering", "decided", "ordered", "delivered"];
const LABELS: Record<string, string> = {
  considering: "Idea",
  decided: "Decided",
  ordered: "Ordered",
  delivered: "Got it",
};

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
  const stage = ORDER.indexOf(item.status);
  const canAdvance = stage >= 0 && stage < ORDER.length - 1;
  const nextLabel = canAdvance ? LABELS[ORDER[stage + 1]] : "";

  return (
    <li className="rounded-[15px] border border-[#efece9] bg-white p-[14px]">
      <div className="flex items-baseline justify-between gap-[10px]">
        <div className="min-w-0 text-[15px] font-semibold text-[#1c1917]">
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
        <div className="flex items-baseline gap-2 whitespace-nowrap">
          {item.price != null && (
            <span className="text-[15px] font-bold text-[#1c1917]">
              {formatMoney(item.price)}
            </span>
          )}
          <button
            onClick={() => startTransition(() => deleteWishlistItem(item.id))}
            disabled={pending}
            aria-label="Delete item"
            className="px-1 text-[#c7c2bc] active:text-[#dc2626]"
          >
            ✕
          </button>
        </div>
      </div>
      <div className="mt-px text-[11px] text-[#a8a29e]">
        {item.roomName ?? "No room"}
      </div>

      <div className="mt-[11px] flex gap-[5px]">
        {ORDER.map((s, i) => (
          <div
            key={s}
            data-stage={s}
            data-active={i === stage ? "true" : "false"}
            className="flex-1 rounded-[7px] py-[5px] text-center text-[10px] font-bold"
            style={{
              background:
                i < stage ? "#d1fae5" : i === stage ? "#059669" : "#f5f2ef",
              color: i === stage ? "#fff" : i < stage ? "#059669" : "#c7c2bc",
            }}
          >
            {LABELS[s]}
          </div>
        ))}
      </div>

      {canAdvance && (
        <button
          onClick={() => startTransition(() => advanceWishlistItem(item.id))}
          disabled={pending}
          className="mt-[9px] w-full rounded-[9px] border border-[#d1fae5] bg-[#f0fdf4] py-2 text-[12px] font-bold text-[#059669] active:bg-emerald-100"
        >
          Move to {nextLabel} →
        </button>
      )}
    </li>
  );
}
