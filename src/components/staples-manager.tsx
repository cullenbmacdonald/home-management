"use client";

import { useState, useTransition } from "react";
import { CATEGORY_LABEL, CATEGORY_ORDER } from "@/lib/groceries";
import type { GroceryCategory } from "@/db/schema";
import {
  addStaple,
  deleteStaple,
  updateStapleCategory,
} from "@/app/(app)/groceries/actions";

export interface StapleRow {
  id: number;
  name: string;
  category: GroceryCategory;
}

export function StaplesManager({ items }: { items: StapleRow[] }) {
  const [name, setName] = useState("");
  const [category, setCategory] = useState<GroceryCategory>("produce");
  const [pending, startTransition] = useTransition();

  const add = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const cat = category;
    setName("");
    startTransition(async () => {
      await addStaple(trimmed, cat);
    });
  };

  const remove = (id: number) =>
    startTransition(async () => {
      await deleteStaple(id);
    });

  const recategorize = (id: number, cat: GroceryCategory) =>
    startTransition(async () => {
      await updateStapleCategory(id, cat);
    });

  const groups = CATEGORY_ORDER.map((cat) => ({
    cat,
    items: items.filter((i) => i.category === cat),
  })).filter((g) => g.items.length > 0);

  return (
    <div>
      {/* Quick-add row */}
      <div className="mb-4 flex items-center gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add();
            }
          }}
          placeholder="Add a staple…"
          aria-label="Add a staple"
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

      <p className="mb-4 px-1 text-[12px] leading-relaxed text-[#a8a29e]">
        Staples are your regulars. Tap “↻ Restock staples” on the list to add
        any that are missing back to the week.
      </p>

      {/* Groups */}
      {groups.map((g) => (
        <div key={g.cat} className="mb-5">
          <div className="mx-1 mb-2 flex items-baseline justify-between">
            <span className="text-[12px] font-bold uppercase tracking-[0.06em] text-[#a8a29e]">
              {CATEGORY_LABEL[g.cat]}
            </span>
            <span className="text-[11px] text-[#c7c2bc]">
              {g.items.length}
            </span>
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
                <span className="min-w-0 flex-1 truncate text-[15px] text-[#1c1917]">
                  {it.name}
                </span>
                <select
                  value={it.category}
                  onChange={(e) =>
                    recategorize(it.id, e.target.value as GroceryCategory)
                  }
                  disabled={pending}
                  aria-label={`Category for ${it.name}`}
                  className="flex-none rounded-[9px] border border-[#e7e5e4] bg-white px-2 py-1 text-[12px] text-[#57534e] outline-none disabled:opacity-50"
                >
                  {CATEGORY_ORDER.map((c) => (
                    <option key={c} value={c}>
                      {CATEGORY_LABEL[c]}
                    </option>
                  ))}
                </select>
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
      ))}

      {items.length === 0 && (
        <div className="rounded-[14px] border border-[#efece9] bg-white p-6 text-center text-[#a8a29e]">
          No staples yet. Add your household regulars above.
        </div>
      )}
    </div>
  );
}
