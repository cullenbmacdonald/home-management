"use client";

import { useState, useTransition } from "react";
import { CATEGORY_LABEL, CATEGORY_ORDER } from "@/lib/groceries";
import type { GroceryCategory } from "@/db/schema";
import {
  addGroceryItem,
  toggleGroceryItem,
  deleteGroceryItem,
  restockStaples,
  clearInCart,
} from "@/app/(app)/groceries/actions";

export interface ShopRow {
  id: number;
  name: string;
  category: GroceryCategory;
  qty: string | null;
  checked: boolean;
  isStaple: boolean;
}

export function ShopList({ items }: { items: ShopRow[] }) {
  const [name, setName] = useState("");
  const [category, setCategory] = useState<GroceryCategory>("produce");
  const [pending, startTransition] = useTransition();

  const inCart = items.filter((i) => i.checked).length;

  const add = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const cat = category;
    setName("");
    startTransition(async () => {
      await addGroceryItem(trimmed, cat);
    });
  };

  const toggle = (id: number) =>
    startTransition(async () => {
      await toggleGroceryItem(id);
    });
  const remove = (id: number) =>
    startTransition(async () => {
      await deleteGroceryItem(id);
    });
  const restock = () =>
    startTransition(async () => {
      await restockStaples();
    });
  const clear = () =>
    startTransition(async () => {
      await clearInCart();
    });

  const groups = CATEGORY_ORDER.map((cat) => ({
    cat,
    items: items.filter((i) => i.category === cat),
  })).filter((g) => g.items.length > 0);

  return (
    <div>
      {/* Quick-add row */}
      <div className="mb-[14px] flex items-center gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add();
            }
          }}
          placeholder="Add an item…"
          aria-label="Add an item"
          className="min-w-0 flex-1 rounded-[12px] border border-[#e7e5e4] bg-white px-[14px] py-[11px] text-[14px] text-[#1c1917] outline-none placeholder:text-[#a8a29e]"
        />
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value as GroceryCategory)}
          aria-label="Category"
          className="flex-none rounded-[12px] border border-[#e7e5e4] bg-white px-2 py-[11px] text-[13px] text-[#57534e] outline-none"
        >
          {CATEGORY_ORDER.map((c) => (
            <option key={c} value={c}>
              {CATEGORY_LABEL[c]}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={add}
          disabled={pending}
          aria-label="Add"
          className="flex h-11 w-11 flex-none items-center justify-center rounded-[12px] bg-[#059669] text-[22px] leading-none text-white disabled:opacity-50"
        >
          +
        </button>
      </div>

      {/* Action chips */}
      <div className="mb-4 flex gap-2">
        <button
          type="button"
          onClick={restock}
          disabled={pending}
          className="flex-1 rounded-[11px] border border-[#e7e5e4] bg-white py-[9px] text-[12px] font-semibold text-[#57534e] disabled:opacity-50"
        >
          ↻ Restock staples
        </button>
        {inCart > 0 && (
          <button
            type="button"
            onClick={clear}
            disabled={pending}
            className="flex-1 rounded-[11px] border border-[#e7e5e4] bg-white py-[9px] text-[12px] font-semibold text-[#57534e] disabled:opacity-50"
          >
            Clear {inCart} in cart
          </button>
        )}
      </div>

      {/* Groups */}
      {groups.map((g) => {
        const left = g.items.filter((i) => !i.checked).length;
        return (
          <div key={g.cat} className="mb-5">
            <div className="mx-1 mb-2 flex items-baseline justify-between">
              <span className="text-[12px] font-bold uppercase tracking-[0.06em] text-[#a8a29e]">
                {CATEGORY_LABEL[g.cat]}
              </span>
              <span className="text-[11px] text-[#c7c2bc]">{left} left</span>
            </div>
            <div className="overflow-hidden rounded-[15px] border border-[#efece9] bg-white">
              {g.items.map((it, idx) => (
                <div
                  key={it.id}
                  className="flex items-center gap-3 px-[14px] py-3"
                  style={{
                    borderBottom:
                      idx < g.items.length - 1 ? "1px solid #f0ede9" : "none",
                  }}
                >
                  <button
                    type="button"
                    onClick={() => toggle(it.id)}
                    disabled={pending}
                    aria-label={it.checked ? "Uncheck" : "Check"}
                    aria-pressed={it.checked}
                    className="flex min-w-0 flex-1 items-center gap-3 text-left"
                  >
                    <span
                      className="flex h-[22px] w-[22px] flex-none items-center justify-center rounded-[7px] border-2 text-[13px] font-extrabold text-white"
                      style={{
                        borderColor: it.checked ? "#059669" : "#d6d3d1",
                        background: it.checked ? "#059669" : "transparent",
                      }}
                    >
                      {it.checked ? "✓" : ""}
                    </span>
                    <span
                      className="min-w-0 flex-1 truncate text-[15px]"
                      style={{
                        color: it.checked ? "#a8a29e" : "#1c1917",
                        textDecoration: it.checked ? "line-through" : "none",
                      }}
                    >
                      {it.name}
                    </span>
                  </button>
                  {it.isStaple && (
                    <span className="flex-none rounded-[5px] border border-[#e7e5e4] px-[5px] py-px text-[9px] font-bold uppercase tracking-[0.05em] text-[#a8a29e]">
                      Staple
                    </span>
                  )}
                  {it.qty && (
                    <span className="flex-none text-[12px] text-[#a8a29e]">
                      {it.qty}
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => remove(it.id)}
                    disabled={pending}
                    aria-label={`Delete ${it.name}`}
                    className="flex-none px-1 text-[15px] leading-none text-[#c7c2bc] hover:text-[#dc2626] disabled:opacity-50"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          </div>
        );
      })}

      {items.length === 0 && (
        <div className="rounded-[14px] border border-[#efece9] bg-white p-6 text-center text-[#a8a29e]">
          List is empty. Tap “Restock staples” to start the week.
        </div>
      )}
    </div>
  );
}
