"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { WeekDay, MonthGrid } from "@/lib/week";
import type { GroceryCategory } from "@/db/schema";
import { CATEGORY_LABEL, CATEGORY_ORDER } from "@/lib/groceries";
import { BottomSheet } from "@/components/bottom-sheet";
import {
  createEvent,
  updateEvent,
  deleteEvent,
  createMeal,
  addMealIngredientsToList,
  type NewIngredient,
} from "@/app/(app)/plan/actions";

export type EventType = "date" | "event" | "chore" | "upkeep";

export interface PlanEvent {
  id: number | null; // null = derived upkeep (not deletable/editable)
  time: string | null;
  timeLabel: string;
  title: string;
  type: EventType;
  who: string | null;
  assigneeId: number | null;
}

export interface MealVM {
  id: number;
  date: string;
  title: string;
  cook: boolean;
  out: boolean;
  added: boolean;
  ingredients: { name: string; category: GroceryCategory; qty: string | null }[];
}

export interface UserOption {
  id: number;
  displayName: string;
}

const TYPE_COLOR: Record<EventType, string> = {
  date: "#059669",
  event: "#0ea5e9",
  chore: "#a8a29e",
  upkeep: "#d97706",
};

const LEGEND: { type: EventType; label: string }[] = [
  { type: "date", label: "Date night" },
  { type: "event", label: "Event" },
  { type: "chore", label: "Chore" },
  { type: "upkeep", label: "Upkeep" },
];

export function PlanView({
  tab,
  grid,
  selectedDay,
  week,
  eventsByDate,
  mealsByDate,
  users,
}: {
  tab: "calendar" | "meals";
  grid: MonthGrid;
  selectedDay: string;
  week: WeekDay[];
  eventsByDate: Record<string, PlanEvent[]>;
  mealsByDate: Record<string, MealVM | undefined>;
  users: UserOption[];
}) {
  const router = useRouter();

  const setTab = (t: "calendar" | "meals") =>
    router.push(`/plan?tab=${t}`, { scroll: false });

  return (
    <div>
      {/* Segmented control */}
      <div className="mb-4 flex gap-1 rounded-[12px] border border-[#e7e5e4] bg-[#f0ede9] p-1">
        {(["calendar", "meals"] as const).map((t) => {
          const active = tab === t;
          return (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={`flex-1 rounded-[9px] py-2 text-[13px] font-semibold capitalize ${
                active
                  ? "bg-white text-[#1c1917] shadow-[0_1px_3px_rgba(0,0,0,0.1)]"
                  : "text-[#78716c]"
              }`}
            >
              {t}
            </button>
          );
        })}
      </div>

      {tab === "calendar" ? (
        <CalendarTab
          grid={grid}
          selectedDay={selectedDay}
          eventsByDate={eventsByDate}
          users={users}
        />
      ) : (
        <MealsTab week={week} mealsByDate={mealsByDate} />
      )}
    </div>
  );
}

/* ---------------- Calendar tab ---------------- */

const WEEKDAY_HEADS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

/** "2026-07-03" -> "Thursday, Jul 3" (parsed as local, no UTC shift). */
function formatDayLong(dateKey: string): string {
  const d = new Date(dateKey + "T00:00:00");
  return d.toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
  });
}

function CalendarTab({
  grid,
  selectedDay,
  eventsByDate,
  users,
}: {
  grid: MonthGrid;
  selectedDay: string;
  eventsByDate: Record<string, PlanEvent[]>;
  users: UserOption[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<PlanEvent | null>(null);

  const go = (params: { month?: string; day?: string }) => {
    const q = new URLSearchParams({ tab: "calendar", ...params });
    router.push(`/plan?${q.toString()}`, { scroll: false });
  };

  const remove = (id: number) =>
    startTransition(async () => {
      await deleteEvent(id);
    });

  const selEvents = eventsByDate[selectedDay] ?? [];

  return (
    <div>
      {/* Month header + nav */}
      <div className="mb-3 flex items-center justify-between">
        <button
          type="button"
          onClick={() => go({ month: grid.prev })}
          aria-label="Previous month"
          className="h-9 w-9 rounded-[10px] border border-[#e7e5e4] bg-white text-[16px] text-[#57534e] hover:bg-[#faf9f8]"
        >
          ‹
        </button>
        <div className="font-serif text-[19px] text-[#1c1917]">{grid.label}</div>
        <button
          type="button"
          onClick={() => go({ month: grid.next })}
          aria-label="Next month"
          className="h-9 w-9 rounded-[10px] border border-[#e7e5e4] bg-white text-[16px] text-[#57534e] hover:bg-[#faf9f8]"
        >
          ›
        </button>
      </div>

      {/* Weekday heads */}
      <div className="grid grid-cols-7 gap-[3px] px-px">
        {WEEKDAY_HEADS.map((w) => (
          <div
            key={w}
            className="pb-1 text-center text-[10px] font-semibold uppercase tracking-[0.03em] text-[#a8a29e]"
          >
            {w[0]}
          </div>
        ))}
      </div>

      {/* Day grid */}
      <div className="grid grid-cols-7 gap-[3px]">
        {grid.cells.map((c) => {
          const dots = (eventsByDate[c.date] ?? []).slice(0, 3);
          const selected = c.date === selectedDay;
          return (
            <button
              key={c.date}
              type="button"
              onClick={() => go({ month: grid.month, day: c.date })}
              className="flex aspect-square flex-col items-center justify-center rounded-[10px] border"
              style={{
                background: c.isToday ? "#059669" : selected ? "#ecfdf5" : "#fff",
                borderColor: selected && !c.isToday ? "#059669" : "#efece9",
                opacity: c.inMonth ? 1 : 0.38,
              }}
            >
              <span
                className="text-[14px] font-semibold"
                style={{ color: c.isToday ? "#fff" : "#1c1917" }}
              >
                {c.day}
              </span>
              <span className="mt-[3px] flex h-[5px] justify-center gap-[2px]">
                {dots.map((e, i) => (
                  <span
                    key={i}
                    className="h-1 w-1 rounded-full"
                    style={{ background: c.isToday ? "#fff" : TYPE_COLOR[e.type] }}
                  />
                ))}
              </span>
            </button>
          );
        })}
      </div>

      {/* Legend */}
      <div className="mx-1 mb-1 mt-[14px] flex flex-wrap gap-3">
        {LEGEND.map((l) => (
          <span
            key={l.type}
            className="flex items-center gap-[5px] text-[11px] text-[#78716c]"
          >
            <span
              className="h-2 w-2 rounded-full"
              style={{ background: TYPE_COLOR[l.type] }}
            />
            {l.label}
          </span>
        ))}
      </div>

      {/* Selected-day detail */}
      <div className="mt-[16px]">
        <div className="mx-1 mb-[7px] text-[14px] font-bold text-[#57534e]">
          {formatDayLong(selectedDay)}
        </div>
        <div className="rounded-[14px] border border-[#efece9] bg-white px-[14px] py-1">
          {selEvents.length === 0 ? (
            <div className="py-3 text-[13px] text-[#c7c2bc]">Nothing planned</div>
          ) : (
            selEvents.map((ev, i) => {
              const editable = ev.id != null;
              return (
                <div
                  key={ev.id ?? `up-${i}`}
                  className="flex items-center gap-[11px] py-[10px]"
                  style={{
                    borderBottom:
                      i < selEvents.length - 1 ? "1px solid #f0ede9" : "none",
                  }}
                >
                  <div className="w-[50px] flex-none text-[12px] font-semibold text-[#78716c]">
                    {ev.timeLabel}
                  </div>
                  <div
                    className="w-[3px] flex-none self-stretch rounded-[2px]"
                    style={{ background: TYPE_COLOR[ev.type] }}
                  />
                  <button
                    type="button"
                    onClick={() => editable && setEditing(ev)}
                    disabled={!editable}
                    aria-label={editable ? `Edit ${ev.title}` : ev.title}
                    className="min-w-0 flex-1 text-left disabled:cursor-default"
                  >
                    <div className="text-[14px] text-[#1c1917]">{ev.title}</div>
                    <div className="mt-px text-[11px] text-[#a8a29e]">
                      {ev.type === "upkeep"
                        ? "Upkeep · mark done in Upkeep"
                        : [
                            LEGEND.find((l) => l.type === ev.type)?.label,
                            ev.who,
                          ]
                            .filter(Boolean)
                            .join(" · ")}
                    </div>
                  </button>
                  {editable && (
                    <button
                      type="button"
                      onClick={() => remove(ev.id!)}
                      disabled={pending}
                      aria-label={`Delete ${ev.title}`}
                      className="flex-none px-1 text-[15px] leading-none text-[#c7c2bc] hover:text-[#dc2626] disabled:opacity-50"
                    >
                      ✕
                    </button>
                  )}
                </div>
              );
            })
          )}
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="w-full py-2 text-left text-[12px] font-semibold text-[#059669]"
          >
            + Add
          </button>
        </div>
      </div>

      {adding && (
        <EventSheet
          date={selectedDay}
          users={users}
          onClose={() => setAdding(false)}
        />
      )}
      {editing && (
        <EventSheet
          date={selectedDay}
          users={users}
          event={editing}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}

function EventSheet({
  date,
  users,
  event,
  onClose,
}: {
  date: string;
  users: UserOption[];
  event?: PlanEvent; // present => edit mode
  onClose: () => void;
}) {
  const editing = event != null;
  const [title, setTitle] = useState(event?.title ?? "");
  const [day, setDay] = useState(date);
  const [time, setTime] = useState(event?.time ?? "");
  const [type, setType] = useState<"date" | "event" | "chore">(
    event && event.type !== "upkeep" ? event.type : "event",
  );
  const [assigneeId, setAssigneeId] = useState<string>(
    event?.assigneeId != null ? String(event.assigneeId) : "",
  );
  const [pending, startTransition] = useTransition();

  const save = () => {
    const t = title.trim();
    if (!t || !day) return;
    startTransition(async () => {
      if (editing && event?.id != null) {
        await updateEvent({
          id: event.id,
          date: day,
          time: time || undefined,
          title: t,
          type,
          assigneeId: assigneeId ? Number(assigneeId) : null,
        });
      } else {
        await createEvent({
          date: day,
          time: time || undefined,
          title: t,
          type,
          assigneeId: assigneeId ? Number(assigneeId) : null,
        });
      }
      onClose();
    });
  };

  const field =
    "w-full rounded-[12px] border border-[#e7e5e4] bg-white px-[14px] py-[11px] text-[14px] text-[#1c1917] outline-none placeholder:text-[#a8a29e]";

  return (
    <BottomSheet open onClose={onClose} surface="bg-[#faf9f8]">
      <div className="mb-3 font-serif text-[23px] text-[#1c1917]">
        {editing ? "Edit event" : "Add event"}
      </div>
      <div className="flex flex-col gap-3">
        <input
          autoFocus
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Title"
          aria-label="Event title"
          className={field}
        />
        <input
          type="date"
          value={day}
          onChange={(e) => setDay(e.target.value)}
          aria-label="Event date"
          className={field}
        />
        <div className="flex gap-2">
          <input
            type="time"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            aria-label="Event time"
            className={`${field} flex-1`}
          />
          <select
            value={type}
            onChange={(e) =>
              setType(e.target.value as "date" | "event" | "chore")
            }
            aria-label="Event type"
            className={`${field} flex-1`}
          >
            <option value="date">Date night</option>
            <option value="event">Event</option>
            <option value="chore">Chore</option>
          </select>
        </div>
        <select
          value={assigneeId}
          onChange={(e) => setAssigneeId(e.target.value)}
          aria-label="Event assignee"
          className={field}
        >
          <option value="">No one</option>
          {users.map((u) => (
            <option key={u.id} value={u.id}>
              {u.displayName}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={save}
          disabled={pending}
          className="rounded-[12px] bg-[#059669] py-3 text-[14px] font-bold text-white disabled:opacity-50"
        >
          {editing ? "Save changes" : "Add event"}
        </button>
      </div>
    </BottomSheet>
  );
}

/* ---------------- Meals tab ---------------- */

function MealsTab({
  week,
  mealsByDate,
}: {
  week: WeekDay[];
  mealsByDate: Record<string, MealVM | undefined>;
}) {
  const [pending, startTransition] = useTransition();
  const [planDate, setPlanDate] = useState<string | null>(null);

  const addToList = (mealId: number) =>
    startTransition(async () => {
      await addMealIngredientsToList(mealId);
    });

  return (
    <div>
      <div className="mx-1 mb-3 text-[13px] leading-[1.5] text-[#a8a29e]">
        Plan dinners for the week, then push a night&apos;s ingredients straight
        onto the grocery list.
      </div>
      {week.map((d) => {
        const meal = mealsByDate[d.date];
        return (
          <div
            key={d.date}
            className="mb-[10px] rounded-[15px] border border-[#efece9] bg-white p-[14px]"
          >
            <div className="flex items-baseline gap-2">
              <span className="w-[34px] text-[12px] font-bold text-[#059669]">
                {d.short}
              </span>
              <span className="text-[11px] text-[#c7c2bc]">{d.monthDay}</span>
            </div>

            {!meal ? (
              <>
                <div className="my-[6px] text-[16px] font-semibold text-[#c7c2bc]">
                  Nothing planned
                </div>
                <button
                  type="button"
                  onClick={() => setPlanDate(d.date)}
                  className="text-[12px] font-bold text-[#059669]"
                >
                  + Plan dinner
                </button>
              </>
            ) : (
              <>
                <div
                  className="my-[6px] text-[16px] font-semibold"
                  style={{ color: meal.out ? "#a8a29e" : "#1c1917" }}
                >
                  {meal.title}
                </div>
                {meal.ingredients.length > 0 ? (
                  <>
                    <div className="text-[12px] leading-[1.5] text-[#a8a29e]">
                      {meal.ingredients.map((i) => i.name).join(" · ")}
                    </div>
                    <button
                      type="button"
                      onClick={() => addToList(meal.id)}
                      disabled={pending || meal.added}
                      className="mt-[11px] rounded-[10px] border border-[#d1fae5] px-[13px] py-2 text-[12px] font-bold text-[#059669] disabled:opacity-100"
                      style={{ background: meal.added ? "#ecfdf5" : "#fff" }}
                    >
                      {meal.added ? "Added to list ✓" : "Add ingredients to list"}
                    </button>
                  </>
                ) : (
                  <div className="text-[12px] italic text-[#c7c2bc]">
                    {meal.out
                      ? "Reservation — nothing to buy"
                      : "Using leftovers"}
                  </div>
                )}
              </>
            )}
          </div>
        );
      })}

      {planDate && (
        <PlanMealSheet date={planDate} onClose={() => setPlanDate(null)} />
      )}
    </div>
  );
}

function PlanMealSheet({
  date,
  onClose,
}: {
  date: string;
  onClose: () => void;
}) {
  const [title, setTitle] = useState("");
  const [cookHome, setCookHome] = useState(true);
  const [out, setOut] = useState(false);
  const [rows, setRows] = useState<NewIngredient[]>([
    { name: "", category: "produce", qty: "" },
  ]);
  const [pending, startTransition] = useTransition();

  const updateRow = (i: number, patch: Partial<NewIngredient>) =>
    setRows((rs) => rs.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  const addRow = () =>
    setRows((rs) => [...rs, { name: "", category: "produce", qty: "" }]);
  const removeRow = (i: number) =>
    setRows((rs) => rs.filter((_, idx) => idx !== i));

  const save = () => {
    const t = title.trim();
    if (!t) return;
    const ingredients = cookHome
      ? rows.filter((r) => r.name.trim())
      : [];
    startTransition(async () => {
      await createMeal({
        date,
        title: t,
        cook: cookHome,
        out: !cookHome && out,
        ingredients,
      });
      onClose();
    });
  };

  const field =
    "w-full rounded-[12px] border border-[#e7e5e4] bg-white px-[14px] py-[11px] text-[14px] text-[#1c1917] outline-none placeholder:text-[#a8a29e]";

  return (
    <BottomSheet open onClose={onClose} surface="bg-[#faf9f8]">
      <div className="mb-3 font-serif text-[23px] text-[#1c1917]">
        Plan dinner
      </div>
      <div className="flex flex-col gap-3">
        <input
          autoFocus
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Dinner"
          aria-label="Dinner title"
          className={field}
        />
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => {
              setCookHome(true);
              setOut(false);
            }}
            className={`flex-1 rounded-[11px] border py-[9px] text-[12px] font-semibold ${
              cookHome
                ? "border-[#059669] bg-[#ecfdf5] text-[#059669]"
                : "border-[#e7e5e4] bg-white text-[#57534e]"
            }`}
          >
            Cook at home
          </button>
          <button
            type="button"
            onClick={() => {
              setCookHome(false);
              setOut(true);
            }}
            className={`flex-1 rounded-[11px] border py-[9px] text-[12px] font-semibold ${
              !cookHome && out
                ? "border-[#059669] bg-[#ecfdf5] text-[#059669]"
                : "border-[#e7e5e4] bg-white text-[#57534e]"
            }`}
          >
            Out / reservation
          </button>
          <button
            type="button"
            onClick={() => {
              setCookHome(false);
              setOut(false);
            }}
            className={`flex-1 rounded-[11px] border py-[9px] text-[12px] font-semibold ${
              !cookHome && !out
                ? "border-[#059669] bg-[#ecfdf5] text-[#059669]"
                : "border-[#e7e5e4] bg-white text-[#57534e]"
            }`}
          >
            Leftovers
          </button>
        </div>

        {cookHome && (
          <div className="flex flex-col gap-2">
            <div className="mx-1 text-[12px] font-bold uppercase tracking-[0.06em] text-[#a8a29e]">
              Ingredients
            </div>
            {rows.map((r, i) => (
              <div key={i} className="flex gap-2">
                <input
                  value={r.name}
                  onChange={(e) => updateRow(i, { name: e.target.value })}
                  placeholder="Name"
                  aria-label={`Ingredient ${i + 1} name`}
                  className={`${field} flex-1`}
                />
                <select
                  value={r.category}
                  onChange={(e) => updateRow(i, { category: e.target.value })}
                  aria-label={`Ingredient ${i + 1} category`}
                  className="flex-none rounded-[12px] border border-[#e7e5e4] bg-white px-2 py-[11px] text-[13px] text-[#57534e] outline-none"
                >
                  {CATEGORY_ORDER.map((c) => (
                    <option key={c} value={c}>
                      {CATEGORY_LABEL[c]}
                    </option>
                  ))}
                </select>
                <input
                  value={r.qty ?? ""}
                  onChange={(e) => updateRow(i, { qty: e.target.value })}
                  placeholder="Qty"
                  aria-label={`Ingredient ${i + 1} qty`}
                  className="w-[64px] flex-none rounded-[12px] border border-[#e7e5e4] bg-white px-2 py-[11px] text-[14px] text-[#1c1917] outline-none placeholder:text-[#a8a29e]"
                />
                <button
                  type="button"
                  onClick={() => removeRow(i)}
                  aria-label={`Remove ingredient ${i + 1}`}
                  className="flex-none px-1 text-[15px] text-[#c7c2bc] hover:text-[#dc2626]"
                >
                  ✕
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={addRow}
              className="mx-1 text-left text-[12px] font-semibold text-[#059669]"
            >
              + Add ingredient
            </button>
          </div>
        )}

        <button
          type="button"
          onClick={save}
          disabled={pending}
          className="rounded-[12px] bg-[#059669] py-3 text-[14px] font-bold text-white disabled:opacity-50"
        >
          Save dinner
        </button>
      </div>
    </BottomSheet>
  );
}
