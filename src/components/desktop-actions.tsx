"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { RAIL_NAV } from "@/components/nav-data";

const QUICK_ADD = [
  { label: "Grocery item", href: "/groceries" },
  { label: "Upkeep item", href: "/maintenance/new" },
  { label: "Calendar event", href: "/plan" },
  { label: "Contact", href: "/vendors" },
];

/**
 * Desktop-only (>= xl) header tools: a jump-to-page search over the app's
 * destinations and a quick-add menu that deep-links to the existing create flows.
 */
export function DesktopActions() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [openSearch, setOpenSearch] = useState(false);
  const [openAdd, setOpenAdd] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpenSearch(false);
        setOpenAdd(false);
      }
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  const matches = query
    ? RAIL_NAV.filter((n) =>
        n.label.toLowerCase().includes(query.toLowerCase()),
      )
    : RAIL_NAV;

  function go(href: string) {
    setQuery("");
    setOpenSearch(false);
    router.push(href);
  }

  return (
    <div ref={wrapRef} className="hidden items-center gap-2 xl:flex">
      <div className="relative">
        <div className="flex items-center gap-2 rounded-[10px] border border-[#e7e5e4] bg-white px-3 py-2">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#a8a29e" strokeWidth="2">
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.5-3.5" />
          </svg>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => setOpenSearch(true)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && matches[0]) go(matches[0].href);
              if (e.key === "Escape") setOpenSearch(false);
            }}
            placeholder="Jump to…"
            className="w-[200px] bg-transparent text-[13px] text-[#1c1917] outline-none placeholder:text-[#a8a29e]"
          />
        </div>
        {openSearch && (
          <ul className="absolute left-0 top-[calc(100%+6px)] z-30 max-h-[320px] w-[240px] overflow-y-auto rounded-[12px] border border-[#efece9] bg-white p-1 shadow-[0_12px_32px_rgba(28,25,23,0.14)]">
            {matches.length === 0 ? (
              <li className="px-3 py-2 text-[13px] text-[#a8a29e]">No matches</li>
            ) : (
              matches.map((n) => (
                <li key={n.href}>
                  <button
                    type="button"
                    onClick={() => go(n.href)}
                    className="flex w-full items-center gap-3 rounded-[9px] px-3 py-2 text-left text-[13px] text-[#57534e] hover:bg-[#f5f2ef]"
                  >
                    {n.icon}
                    {n.label}
                  </button>
                </li>
              ))
            )}
          </ul>
        )}
      </div>

      <div className="relative">
        <button
          type="button"
          onClick={() => setOpenAdd((v) => !v)}
          aria-expanded={openAdd}
          className="flex items-center gap-1.5 rounded-[10px] bg-[#059669] px-3 py-2 text-[13px] font-semibold text-white"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
            <path d="M12 5v14M5 12h14" />
          </svg>
          Add
        </button>
        {openAdd && (
          <ul className="absolute right-0 top-[calc(100%+6px)] z-30 w-[190px] rounded-[12px] border border-[#efece9] bg-white p-1 shadow-[0_12px_32px_rgba(28,25,23,0.14)]">
            {QUICK_ADD.map((a) => (
              <li key={a.label}>
                <button
                  type="button"
                  onClick={() => {
                    setOpenAdd(false);
                    router.push(a.href);
                  }}
                  className="w-full rounded-[9px] px-3 py-2 text-left text-[13px] text-[#57534e] hover:bg-[#f5f2ef]"
                >
                  {a.label}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
