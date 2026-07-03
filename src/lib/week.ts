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
