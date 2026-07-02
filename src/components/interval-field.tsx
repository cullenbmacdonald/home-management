"use client";

import { useState } from "react";

const units = [
  { label: "days", days: 1 },
  { label: "weeks", days: 7 },
  { label: "months", days: 30 },
  { label: "years", days: 365 },
];

export function IntervalField({ defaultDays = 30 }: { defaultDays?: number }) {
  // pick the largest unit that divides evenly
  const initial =
    [...units].reverse().find((u) => defaultDays % u.days === 0) ?? units[0];
  const [count, setCount] = useState(defaultDays / initial.days);
  const [unitDays, setUnitDays] = useState(initial.days);

  return (
    <div>
      <span className="text-sm font-medium text-stone-600">Repeat every</span>
      <div className="mt-1 flex gap-2">
        <input
          type="number"
          min={1}
          value={count}
          onChange={(e) => setCount(Number(e.target.value))}
          className="w-24 rounded-lg border border-stone-300 px-3 py-2.5 focus:border-emerald-600 focus:outline-none"
        />
        <select
          value={unitDays}
          onChange={(e) => setUnitDays(Number(e.target.value))}
          className="flex-1 rounded-lg border border-stone-300 bg-white px-3 py-2.5 focus:border-emerald-600 focus:outline-none"
        >
          {units.map((u) => (
            <option key={u.days} value={u.days}>
              {u.label}
            </option>
          ))}
        </select>
      </div>
      <input type="hidden" name="intervalDays" value={count * unitDays || ""} />
    </div>
  );
}
