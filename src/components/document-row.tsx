"use client";

import { useTransition } from "react";
import { deleteDocument } from "@/app/(app)/documents/actions";

interface DocData {
  id: number;
  title: string;
  originalName: string;
  size: number;
  uploadedAt: Date;
}

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function kindLabel(name: string) {
  const ext = name.includes(".") ? name.split(".").pop() ?? "" : "";
  return (ext || "FILE").slice(0, 4).toUpperCase();
}

export function DocumentRow({ doc }: { doc: DocData }) {
  const [pending, startTransition] = useTransition();
  const date = doc.uploadedAt.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });

  return (
    <li className="flex items-center gap-[13px] rounded-[14px] border border-[#efece9] bg-white p-[14px]">
      <span className="flex h-[38px] w-[38px] flex-none items-center justify-center rounded-[9px] bg-[#fef2f2] text-[10px] font-extrabold text-[#dc2626]">
        {kindLabel(doc.originalName)}
      </span>
      <a
        href={`/api/documents/${doc.id}`}
        target="_blank"
        className="min-w-0 flex-1"
      >
        <div className="truncate text-[14px] font-semibold text-[#1c1917]">
          {doc.title}
        </div>
        <div className="mt-px text-[11px] text-[#a8a29e]">
          {formatSize(doc.size)} · added {date}
        </div>
      </a>
      <span className="flex-none text-[18px] text-[#c7c2bc]">↓</span>
      <button
        onClick={() => {
          if (confirm(`Delete "${doc.title}"?`)) {
            startTransition(() => deleteDocument(doc.id));
          }
        }}
        disabled={pending}
        aria-label="Delete document"
        className="px-1 text-[#c7c2bc] active:text-[#dc2626]"
      >
        ✕
      </button>
    </li>
  );
}
