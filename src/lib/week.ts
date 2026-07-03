/** Local YYYY-MM-DD (not UTC — avoids the timezone shift toISOString causes). */
export function toYMD(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export interface WeekDay {
  date: string; // YYYY-MM-DD
  label: string; // "Thursday"
  short: string; // "Thu"
  num: string; // "2"
  monthDay: string; // "Jul 2"
  isToday: boolean;
}

/** The seven days Mon–Sun of the week containing `today` (Monday-start). */
export function getWeekDays(today: Date): WeekDay[] {
  const dow = today.getDay(); // Sun=0..Sat=6
  const mondayDelta = (dow === 0 ? -6 : 1) - dow;
  const monday = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate() + mondayDelta,
  );
  const todayKey = toYMD(today);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(
      monday.getFullYear(),
      monday.getMonth(),
      monday.getDate() + i,
    );
    return {
      date: toYMD(d),
      label: d.toLocaleDateString("en-US", { weekday: "long" }),
      short: d.toLocaleDateString("en-US", { weekday: "short" }),
      num: String(d.getDate()),
      monthDay: d.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      isToday: toYMD(d) === todayKey,
    };
  });
}

export interface MonthCell {
  date: string; // YYYY-MM-DD
  day: number; // 1..31
  inMonth: boolean; // belongs to the displayed month (vs. spillover)
  isToday: boolean;
}

export interface MonthGrid {
  year: number;
  monthIndex: number; // 0..11
  month: string; // "YYYY-MM"
  label: string; // "July 2026"
  cells: MonthCell[]; // Monday-start, whole weeks covering the month
  prev: string; // "YYYY-MM"
  next: string; // "YYYY-MM"
}

/** "YYYY-MM" for a year + 0-based month. */
export function monthParam(year: number, monthIndex: number): string {
  return `${year}-${String(monthIndex + 1).padStart(2, "0")}`;
}

/** Parse "YYYY-MM"; returns null if malformed or out of range. */
export function parseMonthParam(
  s: string | undefined,
): { year: number; monthIndex: number } | null {
  const m = s?.match(/^(\d{4})-(\d{2})$/);
  if (!m) return null;
  const year = Number(m[1]);
  const monthIndex = Number(m[2]) - 1;
  if (monthIndex < 0 || monthIndex > 11) return null;
  return { year, monthIndex };
}

/** Month calendar grid (Monday-start) with adjacent-month spillover days. */
export function getMonthGrid(
  year: number,
  monthIndex: number,
  today = new Date(),
): MonthGrid {
  const first = new Date(year, monthIndex, 1);
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const offset = (first.getDay() + 6) % 7; // days from Monday to the 1st
  const weeks = Math.ceil((offset + daysInMonth) / 7);
  const todayKey = toYMD(today);

  const cells: MonthCell[] = Array.from({ length: weeks * 7 }, (_, i) => {
    const d = new Date(year, monthIndex, 1 - offset + i);
    return {
      date: toYMD(d),
      day: d.getDate(),
      inMonth: d.getMonth() === monthIndex && d.getFullYear() === year,
      isToday: toYMD(d) === todayKey,
    };
  });

  const prev = new Date(year, monthIndex - 1, 1);
  const next = new Date(year, monthIndex + 1, 1);
  return {
    year,
    monthIndex,
    month: monthParam(year, monthIndex),
    label: first.toLocaleDateString("en-US", { month: "long", year: "numeric" }),
    cells,
    prev: monthParam(prev.getFullYear(), prev.getMonth()),
    next: monthParam(next.getFullYear(), next.getMonth()),
  };
}

/** "19:30" -> "7:30p", "08:00" -> "8:00a", "00:00" -> "12:00a". */
export function formatTime24(t: string | null | undefined): string {
  if (!t) return "";
  const [hStr, mStr = "00"] = t.split(":");
  const h = parseInt(hStr, 10);
  if (!Number.isFinite(h)) return "";
  const ap = h < 12 ? "a" : "p";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${mStr}${ap}`;
}
