"use client";

import { useTransition } from "react";
import { markDone } from "@/app/(app)/maintenance/actions";

export function MarkDoneButton({ itemId }: { itemId: number }) {
  const [pending, startTransition] = useTransition();
  return (
    <button
      onClick={() => startTransition(() => markDone(itemId))}
      disabled={pending}
      className="rounded-lg bg-emerald-700 px-3 py-1.5 text-sm font-semibold text-white active:bg-emerald-800 disabled:opacity-50"
    >
      {pending ? "…" : "Done ✓"}
    </button>
  );
}
