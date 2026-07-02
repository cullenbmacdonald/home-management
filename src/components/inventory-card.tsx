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

  return (
    <li className="rounded-xl bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="font-medium">{item.name}</div>
          <div className="text-xs text-stone-500">
            {[item.roomName, item.brand, item.model].filter(Boolean).join(" · ") || "—"}
          </div>
        </div>
        <button
          onClick={() => {
            if (confirm(`Delete ${item.name}?`)) {
              startTransition(() => deleteInventoryItem(item.id));
            }
          }}
          disabled={pending}
          aria-label="Delete item"
          className="px-1 text-stone-300 active:text-red-500"
        >
          ✕
        </button>
      </div>
      <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
        {item.serial && (
          <div>
            <dt className="text-xs text-stone-400">Serial</dt>
            <dd className="font-mono text-xs">{item.serial}</dd>
          </div>
        )}
        {item.purchaseDate && (
          <div>
            <dt className="text-xs text-stone-400">Purchased</dt>
            <dd>{formatDate(item.purchaseDate)}</dd>
          </div>
        )}
        {item.warrantyUntil && (
          <div>
            <dt className="text-xs text-stone-400">Warranty</dt>
            <dd className={warrantyActive ? "text-emerald-700" : "text-stone-400"}>
              {warrantyActive ? "until " : "expired "}
              {formatDate(item.warrantyUntil)}
            </dd>
          </div>
        )}
        {item.manualUrl && (
          <div>
            <dt className="text-xs text-stone-400">Manual</dt>
            <dd>
              <a href={item.manualUrl} target="_blank" rel="noreferrer" className="text-emerald-700 underline">
                open ↗
              </a>
            </dd>
          </div>
        )}
      </dl>
      {item.notes && <p className="mt-2 text-sm text-stone-500">{item.notes}</p>}
    </li>
  );
}
