"use client";

import { useTransition } from "react";
import { toggleTask, deleteTask } from "@/app/(app)/tasks/actions";
import { formatDate } from "@/lib/format";

interface TaskData {
  id: number;
  title: string;
  dueDate: string | null;
  completedAt: Date | null;
  assigneeName: string | null;
}

export function TaskRow({ task }: { task: TaskData }) {
  const [pending, startTransition] = useTransition();
  const done = task.completedAt != null;
  const overdue =
    !done &&
    task.dueDate != null &&
    task.dueDate < new Date().toISOString().slice(0, 10);

  return (
    <li
      className={`flex items-center gap-3 rounded-[14px] border border-[#efece9] bg-white px-[14px] py-[13px] ${
        done ? "opacity-60" : ""
      }`}
    >
      <button
        onClick={() => startTransition(() => toggleTask(task.id))}
        disabled={pending}
        aria-label={done ? "Mark incomplete" : "Mark complete"}
        className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[13px] font-extrabold ${
          done
            ? "border-none bg-[#059669] text-white"
            : "border-2 border-[#d6d3d1] text-transparent"
        }`}
      >
        ✓
      </button>
      <div className="min-w-0 flex-1">
        <div
          className={
            done
              ? "text-[14px] text-[#78716c] line-through"
              : "text-[15px] text-[#1c1917]"
          }
        >
          {task.title}
        </div>
        {!done && (
          <div className="mt-[3px] flex items-center gap-2">
            <span className="text-[11px] font-semibold text-[#78716c]">
              {task.assigneeName ?? "Anyone"}
            </span>
            {task.dueDate && (
              <span
                data-overdue={overdue ? "true" : "false"}
                className={`text-[11px] font-semibold ${
                  overdue ? "text-[#dc2626]" : "text-[#78716c]"
                }`}
              >
                {formatDate(task.dueDate)}
              </span>
            )}
          </div>
        )}
      </div>
      <button
        onClick={() => startTransition(() => deleteTask(task.id))}
        disabled={pending}
        aria-label="Delete task"
        className="px-1 text-[#c7c2bc] active:text-[#dc2626]"
      >
        ✕
      </button>
    </li>
  );
}
