import { asc, desc, isNull, isNotNull } from "drizzle-orm";
import { db } from "@/db";
import { tasks, users } from "@/db/schema";
import { createTask } from "./actions";
import { TaskRow } from "@/components/task-row";

export const dynamic = "force-dynamic";

const inputCls =
  "w-full rounded-[10px] border border-[#e7e5e4] bg-white px-3 py-2.5 text-[14px] text-[#1c1917] placeholder:text-[#a8a29e] focus:border-[#059669] focus:outline-none";

export default async function TasksPage() {
  const allUsers = await db.select().from(users);
  const userMap = new Map(allUsers.map((u) => [u.id, u.displayName]));

  const open = await db
    .select()
    .from(tasks)
    .where(isNull(tasks.completedAt))
    .orderBy(asc(tasks.dueDate), desc(tasks.createdAt));
  const done = await db
    .select()
    .from(tasks)
    .where(isNotNull(tasks.completedAt))
    .orderBy(desc(tasks.completedAt))
    .limit(20);

  return (
    <div className="space-y-4">
      <form
        action={createTask}
        className="space-y-2 rounded-[14px] border border-[#efece9] bg-white p-3"
      >
        <input name="title" required placeholder="Add a task…" className={inputCls} />
        <div className="flex gap-2">
          <select
            name="assigneeId"
            defaultValue=""
            className="flex-1 rounded-[10px] border border-[#e7e5e4] bg-white px-2 py-2 text-[13px]"
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
            className="flex-1 rounded-[10px] border border-[#e7e5e4] px-2 py-2 text-[13px]"
          />
          <button
            type="submit"
            className="rounded-[10px] bg-[#059669] px-4 py-2 text-[13px] font-bold text-white active:bg-emerald-800"
          >
            Add
          </button>
        </div>
      </form>

      <ul className="space-y-[8px]">
        {open.map((t) => (
          <TaskRow
            key={t.id}
            task={{ ...t, assigneeName: t.assigneeId ? userMap.get(t.assigneeId) ?? null : null }}
          />
        ))}
        {open.length === 0 && (
          <li className="rounded-[14px] border border-[#efece9] bg-white p-6 text-center text-[#a8a29e]">
            Nothing to do. Nice.
          </li>
        )}
      </ul>

      {done.length > 0 && (
        <details className="rounded-[14px] border border-[#efece9] bg-white p-4">
          <summary className="cursor-pointer text-[12px] font-bold uppercase tracking-[0.06em] text-[#a8a29e]">
            Recently done ({done.length})
          </summary>
          <ul className="mt-2 space-y-[8px]">
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
