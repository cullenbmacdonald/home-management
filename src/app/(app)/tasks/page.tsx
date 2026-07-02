import { asc, desc, isNull, isNotNull } from "drizzle-orm";
import { db } from "@/db";
import { tasks, users } from "@/db/schema";
import { createTask } from "./actions";
import { TaskRow } from "@/components/task-row";

export const dynamic = "force-dynamic";

export default function TasksPage() {
  const allUsers = db.select().from(users).all();
  const userMap = new Map(allUsers.map((u) => [u.id, u.displayName]));

  const open = db
    .select()
    .from(tasks)
    .where(isNull(tasks.completedAt))
    .orderBy(asc(tasks.dueDate), desc(tasks.createdAt))
    .all();
  const done = db
    .select()
    .from(tasks)
    .where(isNotNull(tasks.completedAt))
    .orderBy(desc(tasks.completedAt))
    .limit(20)
    .all();

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Tasks</h1>

      <form
        action={createTask}
        className="space-y-2 rounded-xl bg-white p-3 shadow-sm"
      >
        <input
          name="title"
          required
          placeholder="Add a task…"
          className="w-full rounded-lg border border-stone-300 px-3 py-2.5 focus:border-emerald-600 focus:outline-none"
        />
        <div className="flex gap-2">
          <select
            name="assigneeId"
            className="flex-1 rounded-lg border border-stone-300 bg-white px-2 py-2 text-sm"
            defaultValue=""
          >
            <option value="">Anyone</option>
            {allUsers.map((u) => (
              <option key={u.id} value={u.id}>
                {u.displayName}
              </option>
            ))}
          </select>
          <input
            name="dueDate"
            type="date"
            className="flex-1 rounded-lg border border-stone-300 px-2 py-2 text-sm"
          />
          <button
            type="submit"
            className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white"
          >
            Add
          </button>
        </div>
      </form>

      <ul className="space-y-2">
        {open.map((t) => (
          <TaskRow
            key={t.id}
            task={{ ...t, assigneeName: t.assigneeId ? userMap.get(t.assigneeId) ?? null : null }}
          />
        ))}
        {open.length === 0 && (
          <li className="rounded-xl bg-white p-6 text-center text-stone-500">
            Nothing to do. Nice.
          </li>
        )}
      </ul>

      {done.length > 0 && (
        <details className="rounded-xl bg-white p-4 shadow-sm">
          <summary className="cursor-pointer text-sm font-medium text-stone-500">
            Recently completed ({done.length})
          </summary>
          <ul className="mt-2 space-y-2">
            {done.map((t) => (
              <TaskRow
                key={t.id}
                task={{ ...t, assigneeName: t.assigneeId ? userMap.get(t.assigneeId) ?? null : null }}
              />
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}
