"use client";

import { useTransition } from "react";
import { deleteInventoryItem } from "@/app/(app)/inventory/actions";
import { formatDate } from "@/lib/format";

interface InventoryData {
  id: number;
  name: string;
  brand: string | null;
  model: string | null;
  serial: string | null;
  purchaseDate: string | null;
  warrantyUntil: string | null;
  manualUrl: string | null;
  notes: string | null;
  roomName: string | null;
}

export function InventoryCard({ item }: { item: InventoryData }) {
  const [pending, startTransition] = useTransition();
  const warrantyActive =
    item.warrantyUntil != null &&
    item.warrantyUntil >= new Date().toISOString().slice(0, 10);
  const brandLine = [item.brand, item.model].filter(Boolean).join(" ");
  const hasDetails =
    item.serial || item.purchaseDate || item.manualUrl || item.notes;

  return (
    <li className="rounded-[14px] border border-[#efece9] bg-white p-[14px]">
      <div className="flex items-baseline justify-between gap-2">
        <div className="text-[15px] font-semibold text-[#1c1917]">{item.name}</div>
        <div className="flex items-center gap-2">
          {item.warrantyUntil && (
            <span
              data-warranty={warrantyActive ? "active" : "expired"}
              className="rounded-[6px] px-2 py-[2px] text-[11px] font-bold"
              style={{
                color: warrantyActive ? "#059669" : "#a8a29e",
                background: warrantyActive ? "#ecfdf5" : "#f5f2ef",
              }}
            >
              {warrantyActive
                ? `until ${formatDate(item.warrantyUntil)}`
                : "expired"}
            </span>
          )}
          <button
            onClick={() => {
              if (confirm(`Delete ${item.name}?`)) {
                startTransition(() => deleteInventoryItem(item.id));
              }
            }}
            disabled={pending}
            aria-label="Delete item"
            className="px-1 text-[#c7c2bc] active:text-[#dc2626]"
          >
            ✕
          </button>
        </div>
      </div>
      {brandLine && (
        <div className="mt-[3px] text-[13px] text-[#78716c]">{brandLine}</div>
      )}
      {item.roomName && (
        <div className="mt-[2px] text-[11px] text-[#a8a29e]">{item.roomName}</div>
      )}

      {hasDetails && (
        <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-[13px]">
          {item.serial && (
            <div>
              <dt className="text-[11px] text-[#a8a29e]">Serial</dt>
              <dd className="font-mono text-[12px] text-[#57534e]">{item.serial}</dd>
            </div>
          )}
          {item.purchaseDate && (
            <div>
              <dt className="text-[11px] text-[#a8a29e]">Purchased</dt>
              <dd className="text-[#57534e]">{formatDate(item.purchaseDate)}</dd>
            </div>
          )}
          {item.manualUrl && (
            <div>
              <dt className="text-[11px] text-[#a8a29e]">Manual</dt>
              <dd>
                <a
                  href={item.manualUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-[#059669] underline"
                >
                  open ↗
                </a>
              </dd>
            </div>
          )}
        </dl>
      )}
      {item.notes && (
        <p className="mt-2 text-[13px] text-[#78716c]">{item.notes}</p>
      )}
    </li>
  );
}
