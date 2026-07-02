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
  const overdue =
    !task.completedAt &&
    task.dueDate != null &&
    task.dueDate < new Date().toISOString().slice(0, 10);

  return (
    <li className="flex items-center gap-3 rounded-xl bg-white p-3 shadow-sm">
      <button
        onClick={() => startTransition(() => toggleTask(task.id))}
        disabled={pending}
        aria-label={task.completedAt ? "Mark incomplete" : "Mark complete"}
        className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 text-sm ${
          task.completedAt
            ? "border-emerald-600 bg-emerald-600 text-white"
            : "border-stone-300 text-transparent"
        }`}
      >
        ✓
      </button>
      <div className="min-w-0 flex-1">
        <div
          className={
            task.completedAt ? "text-stone-400 line-through" : "font-medium"
          }
        >
          {task.title}
        </div>
        <div className="text-xs text-stone-500">
          {task.assigneeName ?? "Anyone"}
          {task.dueDate && (
            <span className={overdue ? "font-semibold text-red-600" : ""}>
              {" "}
              · {formatDate(task.dueDate)}
            </span>
          )}
        </div>
      </div>
      <button
        onClick={() => startTransition(() => deleteTask(task.id))}
        disabled={pending}
        aria-label="Delete task"
        className="px-2 text-stone-300 active:text-red-500"
      >
        ✕
      </button>
    </li>
  );
}
