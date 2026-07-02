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

export function DocumentRow({ doc }: { doc: DocData }) {
  const [pending, startTransition] = useTransition();
  return (
    <li className="flex items-center gap-3 rounded-xl bg-white p-4 shadow-sm">
      <a href={`/api/documents/${doc.id}`} target="_blank" className="min-w-0 flex-1">
        <div className="truncate font-medium text-emerald-800">{doc.title}</div>
        <div className="text-xs text-stone-500">
          {doc.originalName} · {formatSize(doc.size)} ·{" "}
          {doc.uploadedAt.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
        </div>
      </a>
      <button
        onClick={() => {
          if (confirm(`Delete "${doc.title}"?`)) {
            startTransition(() => deleteDocument(doc.id));
          }
        }}
        disabled={pending}
        aria-label="Delete document"
        className="px-1 text-stone-300 active:text-red-500"
      >
        ✕
      </button>
    </li>
  );
}
